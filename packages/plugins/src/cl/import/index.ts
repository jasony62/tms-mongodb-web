import { PluginProfileScope, PluginProfileAmount } from 'tmw-data'
import {
  loadConfig,
  ModelDb,
  ModelCl,
  ModelDoc,
  ModelSchema,
  ModelSpreadsheet,
  createDocWebhook,
} from 'tmw-kit'
import { PluginBase } from 'tmw-kit/dist/plugin/index.js'
import path from 'path'
import _ from 'lodash'
import dayjs from 'dayjs'
import Debug from 'debug'

const debug = Debug('tmw:plugins:cl-import')

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址（不含扩展名）
const ConfigFile =
  process.env.TMW_PLUGIN_CL_IMPORT_CONFIG_NAME || './plugin/cl/import'

/**
 * 保存元数据的数据库
 */
const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'
/**
 * 保存元数据的集合
 */
const META_ADMIN_CL = 'mongodb_object'

/**
 * 导入集合
 */
class ImportPlugin extends PluginBase {
  DownloadHost: string

  constructor(file: string) {
    super(file)
    this.name = 'cl-import'
    this.title = '导入集合'
    this.description = '在数据库下通过导入excel，新建schema，collection和文档。'
    this.scope = PluginProfileScope.collection
    this.amount = PluginProfileAmount.zero
    this.beforeWidget = { name: 'external', url: '', size: '60%' }
  }
  /**
   *
   * @returns
   */
  calcFields(schema: any, titles: string[], names: string[]) {
    let fields: any
    if (schema && typeof schema === 'object') {
      if (Array.isArray(titles) && titles.length) {
        fields = titles.map((title: string, index) => {
          let s = Object.entries(schema).find(
            ([name, props]: [string, any]) => props.title === title
          )
          if (s) return { name: s[0] }
          return { name: names[index], spare: true }
        })
      } else if (Array.isArray(names) && names.length) {
        fields = names.map((colName: string, index) => {
          let s = Object.entries(schema).find(
            ([name, props]: [string, any]) => name === colName
          )
          if (s) return { name: colName }
          return { name: colName, spare: true }
        })
      } else {
        fields = Object.keys(schema)
      }
    } else {
      fields = names.map((name: string) => {
        return { name }
      })
    }
    return fields
  }
  /**
   * 将数组数据转换为文档数据
   */
  aoaToDocs(fields, rowsAoa, excludeSpare = false) {
    const docs: any[] = []
    for (let i = 0; i < rowsAoa.length; i++) {
      let doc = fields?.reduce((doc: any, field: any, index: number) => {
        // 跳过多余的列
        if (field.spare === true && excludeSpare === true) return doc
        let val: any = rowsAoa[i][index]
        if (val instanceof Date) {
          // excel的时间差43秒
          val = new Date(val.getTime() + 43000).toLocaleString()
        }
        if (val !== null && val !== undefined) doc[field.name] = val
        return doc
      }, {})
      // 忽略空对象
      if (Object.keys(doc).length) docs.push(doc)
    }

    return docs
  }
  /**
   * 上传数据
   *
   * @param ctrl
   * @returns
   */
  async executeUpload(ctrl: any) {
    let {
      data, // 对象数组的字符串
      names, // 列名称，字符串数组
      titles, // 列标题，字符串数组
      clTitle, // 集合标题
      clName, // 集合名称
      clSchemaId, // 字段定义id
      dir_full_name, // 集合所属分类目录，字符串
      clIdOrderBy, // 集合文档默认排序
      clSpreadsheet, // 字符串 no/yes
      excludeSpare, // 排除多余数据
    } = ctrl.request.body.widget

    const dbName = ctrl.request.query.db

    if (!data) return { code: 10001, msg: '文件上传失败' }

    if (!clTitle) return { code: 10001, msg: '解析上传的文件名称失败' }
    debug(`默认以文件名【${clTitle}】做为文档列定义和集合的标题`)

    if (new RegExp('^[a-zA-Z]+[0-9a-zA-Z_]{0,63}$').test(clName) !== true)
      return {
        code: 10001,
        msg: '集合名必须以英文字母开头，仅限英文字母或_或数字组合，且最长64位',
      }

    if (!clSchemaId) {
      for (const name of names) {
        if (new RegExp('[\u4E00-\u9FA5]+').test(name) == true)
          return { code: 10001, msg: '指定的列定义名称不能包含中文' }
      }
    }

    // 获得集合所属的数据
    const modelDb = new ModelDb(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const existDb = await modelDb.byName(dbName)
    if (!existDb) return { code: 10001, msg: `数据库【${dbName}】不存在` }

    // 如果需要创建schema，查询是否存在同名文档字段定义
    if (!clSchemaId) {
      const [existFlag, existResult] = await this.schemaByName(
        ctrl,
        existDb,
        clName
      )
      if (!existFlag) return { code: 10001, msg: existResult }
    }

    let rowsAoa = JSON.parse(data)
    if (!Array.isArray(rowsAoa) || rowsAoa.length === 0)
      return { code: 10001, msg: '上传的文件数据为空或格式错误' }

    let schema_id
    if (clSchemaId) {
      // 使用指定文档字段定义
      schema_id = clSchemaId
    } else {
      // 创建文档字段定义
      const [schemaFlag, schemaRst] = await this.createDocSchema(
        ctrl,
        existDb,
        {
          clName,
          clTitle,
          headersName: names,
          headersTitle: titles,
        }
      )
      if (!schemaFlag) return { code: 10001, msg: schemaRst }
      debug(`创建了文档列定义[id=${schemaRst}]`)
      schema_id = schemaRst
    }

    // 创建集合
    const clInfo: any = {
      clName,
      dir_full_name,
      title: clTitle,
      schema_id,
      clSpreadsheet,
      orderBy: { _id: clIdOrderBy ?? 'desc' },
    }
    const [clFlag, clRst] = await this.createCl(ctrl, existDb, clInfo)
    if (!clFlag) return { code: 10001, msg: clRst }
    debug(
      `创建集合对象[db.name=${existDb.name}][db.sysname=${existDb.sysname}][name=${clName}][sysname=${clName}]`
    )

    /**
     * 将数组格式数据转换成json文档
     */
    const schema = await this.schemaById(ctrl, clSchemaId)
    const fields = this.calcFields(schema, titles, names)
    const docs = this.aoaToDocs(fields, rowsAoa, excludeSpare)

    let result: any
    if (clSpreadsheet === 'yes') {
      /**
       * 表格数据添加到自由表格中
       */
      const modelCl = new ModelCl(ctrl.mongoClient, ctrl.bucket, ctrl.client)
      const newCl = await modelCl.byName(existDb, clName)
      result = await this.createSpreadsheet(ctrl, existDb, newCl, names, docs)
    } else {
      /**
       * 表格数据添加到集合中
       */
      result = await this.createDocuments(ctrl, existDb, clName, docs)
    }

    return result
  }
  /**
   * 获得指定的schema
   *
   * @param ctrl
   */
  async executeGetSchema(ctrl: any) {
    const { schemaId } = ctrl.request.body.widget
    const schema = await this.schemaById(ctrl, schemaId)
    return { code: 0, msg: { schema } }
  }
  /**
   * 获得可用字段定义
   *
   * @param ctrl
   * @returns
   */
  async executeSchemas(ctrl: any) {
    const dbName = ctrl.request.query.db
    const modelSch = new ModelSchema(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const schemas = await modelSch.listSimple(dbName)
    return { code: 0, msg: { schemas } }
  }
  /**
   *
   * @param ctrl
   * @returns
   */
  async execute(ctrl: any) {
    const { method } = ctrl.request.body.widget
    if (method === 'ListSchemas') {
      return this.executeSchemas(ctrl)
    } else if (method === 'GetSchema') {
      return this.executeGetSchema(ctrl)
    }
    return this.executeUpload(ctrl)
  }
  /**
   * 存储管理对象的集合
   */
  private clMongoObj(ctrl) {
    let { mongoClient } = ctrl
    const cl = mongoClient.db(META_ADMIN_DB).collection(META_ADMIN_CL)

    return cl
  }

  private findSysColl(ctrl, existDb, clSysname) {
    let { mongoClient } = ctrl
    let sysCl = mongoClient.db(existDb.sysname).collection(clSysname)

    return sysCl
  }
  /**
   * 按id查找文档字段定义
   *
   * @param ctrl
   * @param schemaId
   * @returns
   */
  async schemaById(ctrl: any, schemaId: string) {
    const modelSch = new ModelSchema(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const schema = await modelSch.bySchemaId(schemaId)
    return schema
  }
  /**
   * 按名称查找文档字段定义
   */
  async schemaByName(ctrl, existDb, clName) {
    const find: any = {
      name: clName,
      type: 'schema',
    }
    if (existDb) find['db.sysname'] = existDb.sysname
    if (ctrl.bucket) find.bucket = ctrl.bucket.name

    let existSchema = await this.clMongoObj(ctrl).findOne(find, {
      projection: { _id: 1 },
    })

    if (existSchema) return [false, '已存在同名文档列定义']
    return [true]
  }
  /**
   * 新建文档列定义
   */
  async createDocSchema(ctrl, existDb, info) {
    /**
     * 文档定义模板
     */
    const tpl: any = {
      scope: 'document',
      tags: [],
      body: {
        required: false,
        groupable: false,
        dependencies: {},
        eventDependencies: {},
        readonly: false,
        default: '',
        type: 'object',
        properties: {},
      },
      type: 'schema',
      order: 99999,
    }

    const {
      clName: schemaName,
      clTitle: schemaTitle,
      headersName,
      headersTitle,
    } = info

    let mergeObj = {}
    headersName.map((v, i) => {
      mergeObj[headersName[i]] =
        headersTitle && headersTitle[i] ? headersTitle[i] : headersName[i]
    })

    let properties = {}
    for (const k of headersName) {
      if (!k) continue
      if (k.indexOf('.') > -1) {
        const childKey = k.split('.')
        const setKey = []
        for (let i = 0; i < childKey.length - 1; i++) {
          setKey.push(childKey[i])
          const childProperties = _.get(properties, setKey)
          if (i === 0 && !childProperties) {
            // 多节点头
            _.set(properties, setKey, { type: 'object', title: childKey[i] })
            setKey.push('properties')
          } else {
            if (!childProperties)
              _.set(properties, setKey, {
                type: 'object',
                title: childKey[i],
              })

            setKey.push('properties')
            if (i === childKey.length - 2) {
              // 多节点尾
              setKey.push(childKey[childKey.length - 1])
              _.set(properties, setKey, {
                type: 'string',
                title: childKey[childKey.length - 1],
              })
            }
          }
        }
      } else {
        properties[k] = { type: 'string', title: mergeObj[k] }
      }
    }

    tpl.name = schemaName
    tpl.title = schemaTitle
    if (existDb) tpl.db = { sysname: existDb.sysname, name: existDb.name }

    if (ctrl.bucket) tpl.bucket = ctrl.bucket.name
    tpl.body.properties = properties
    tpl.TMW_CREATE_TIME = dayjs().format('YYYY-MM-DD HH:mm:ss')
    tpl.TMW_CREATE_FROM = 'collection'

    return this.clMongoObj(ctrl)
      .insertOne(tpl)
      .then((result) => [true, result.insertedId.toString()])
      .catch((err) => [false, err.message])
  }
  /**
   * 新建集合
   */
  async createCl(ctrl, existDb, info) {
    // 创建集合
    const modelCl = new ModelCl(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    /**
     * 集合对象模板
     */
    const clTpl: any = {
      type: 'collection',
      tags: [],
    }

    const { clName, title, schema_id, dir_full_name, clSpreadsheet, orderBy } =
      info
    clTpl.name = clName
    clTpl.sysname = clName
    clTpl.title = title
    clTpl.schema_id = schema_id
    if (dir_full_name) clTpl.dir_full_name = dir_full_name
    if (clSpreadsheet === 'yes') clTpl.spreadsheet = 'yes'
    clTpl.orderBy = orderBy

    return await modelCl.create(existDb, clTpl)
  }
  /**
   * 添加文档
   *
   * @param ctrl
   * @param existDb
   * @param clName
   * @param docs
   * @returns
   */
  async createDocuments(ctrl, existDb, clName, docs) {
    const modelDoc = new ModelDoc(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const docWebhook = createDocWebhook(process.env.TMW_APP_WEBHOOK)

    let finishRows = docs.map((doc) => {
      let newDoc: any = {}
      for (let k in doc) {
        let oneRow = _.get(doc, k)
        if (typeof oneRow === 'number') oneRow = String(oneRow)
        _.set(newDoc, k.split('.'), oneRow)
      }
      // 加工数据
      modelDoc.processBeforeStore(newDoc, 'insert')

      return newDoc
    })

    try {
      // 通过webhook处理数据
      let beforeRst: any = await docWebhook.beforeCreate(finishRows, existDb)

      if (beforeRst.passed !== true)
        return {
          code: 10001,
          msg: beforeRst.reason || '操作被Webhook.beforeCreate阻止',
        }

      if (beforeRst.rewrited && typeof beforeRst.rewrited === 'object')
        finishRows = beforeRst.rewrited

      // 数据存储到集合中
      const rst = await this.findSysColl(ctrl, existDb, clName)
        .insertMany(finishRows)
        .then(async (r) => {
          debug(`导入的数据已存储到[db=${existDb.name}][cl=${clName}]`)
          await modelDoc.dataActionLog(r.ops, '创建', existDb.name, clName)
          return finishRows
        })

      // 通过webhook处理数据
      let afterRst: any = await docWebhook.afterCreate(rst, existDb)
      if (afterRst.passed !== true)
        return {
          code: 10001,
          msg: afterRst.reason || '操作被Webhook.afterCreate阻止',
        }

      return { code: 0, msg: '导入成功' }
    } catch (error) {
      debug(`数据存储错误: ${error.message}`)
      return { code: 10001, msg: error.message }
    }
  }
  /**
   * 创建自由表格并填写数据
   *
   * @param ctrl
   * @param tmwDb
   * @param tmwCl
   * @param headersName
   * @param docs
   * @returns
   */
  async createSpreadsheet(ctrl, tmwDb, tmwCl, headersName, docs) {
    const modelSS = new ModelSpreadsheet(
      ctrl.mongoClient,
      ctrl.bucket,
      ctrl.client
    )

    const rows = docs.reduce((rows, doc, index) => {
      const cells = {}
      headersName.forEach((name, index) => {
        if (doc[name]) cells['' + index] = { text: doc[name] }
      })
      rows['' + index] = { cells }
      return rows
    }, {})

    const proto: any = { rows }
    await modelSS.create(ctrl.client, tmwDb.sysname, tmwCl, proto)

    return { code: 0, msg: '导入成功' }
  }
}

export async function createPlugin(file: string) {
  let config
  if (ConfigFile) config = await loadConfig(ConfigDir, ConfigFile)
  if (config && typeof config === 'object') {
    let { widgetUrl, bucket, db, title, disabled, dbBlacklist } = config
    const newPlugin = new ImportPlugin(file)
    newPlugin.beforeWidget.url = widgetUrl

    if (bucket) newPlugin.bucketName = new RegExp(bucket)
    if (db) newPlugin.dbName = new RegExp(db)

    if (title && typeof title === 'string') newPlugin.title = title

    if (disabled) newPlugin.disabled = disabled
    if (dbBlacklist) newPlugin.dbBlacklist = new RegExp(dbBlacklist)

    return newPlugin
  }

  return false
}
