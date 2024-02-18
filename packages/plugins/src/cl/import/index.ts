import { PluginProfileScope, PluginProfileAmount } from 'tmw-data'
import {
  loadConfig,
  ModelDb,
  ModelCl,
  ModelDoc,
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
    this.beforeWidget = { name: 'external', url: '', size: '40%' }
  }

  async execute(ctrl: any) {
    let {
      file,
      fileName,
      clName,
      clSpreadsheet, // 字符串 no/yes
      headers: headersName, // 字符串数组
      headersTitle,
    } = ctrl.request.body.widget
    const dbName = ctrl.request.query.db

    if (!file) return { code: 10001, msg: '文件上传失败' }

    if (!fileName) return { code: 10001, msg: '解析上传的文件名称失败' }
    fileName = fileName.substr(0, fileName.lastIndexOf('.'))
    debug(`默认以文件名【${fileName}】做为文档列定义和集合的标题`)

    if (new RegExp('^[a-zA-Z]+[0-9a-zA-Z_]{0,63}$').test(clName) !== true)
      return {
        code: 10001,
        msg: '集合名必须以英文字母开头，仅限英文字母或_或数字组合，且最长64位',
      }

    for (const name of headersName) {
      if (new RegExp('[\u4E00-\u9FA5]+').test(name) == true)
        return { code: 10001, msg: '指定的列定义名称不能包含中文' }
    }

    const modelDb = new ModelDb(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const existDb = await modelDb.byName(dbName)
    if (!existDb) return { code: 10001, msg: `数据库【${dbName}】不存在` }
    debug(`db info: ${JSON.stringify(existDb)}`)

    // 查询是否存在同名文档列定义
    const [existFlag, existResult] = await this.schemaByName(
      ctrl,
      existDb,
      clName
    )
    if (!existFlag) return { code: 10001, msg: existResult }

    let rowsJson = JSON.parse(file)
    if (!Array.isArray(rowsJson) || rowsJson.length === 0)
      return { code: 10001, msg: '上传的文件数据为空或格式错误' }

    // if (headersTitle) delete rowsJson[0]

    // 创建文档列定义
    const [schemaFlag, schemaRst] = await this.createDocSchema(ctrl, existDb, {
      clName,
      clTitle: fileName,
      headersName,
      headersTitle,
    })
    if (!schemaFlag) return { code: 10001, msg: schemaRst }
    debug(`创建了文档列定义[id=${schemaRst}]`)

    // 创建集合
    const clInfo: any = {
      clName,
      title: fileName,
      schema_id: schemaRst,
      clSpreadsheet,
    }
    const [clFlag, clRst] = await this.createCl(ctrl, existDb, clInfo)
    if (!clFlag) return { code: 10001, msg: clRst }
    debug(
      `创建集合对象[db.name=${existDb.name}][db.sysname=${existDb.sysname}][name=${clName}][sysname=${clName}]`
    )

    let result: any
    if (clSpreadsheet === 'yes') {
      /**
       * 表格数据添加到自由表格中
       */
      const modelCl = new ModelCl(ctrl.mongoClient, ctrl.bucket, ctrl.client)
      const newCl = await modelCl.byName(existDb, clName)
      result = await this.createSpreadsheet(
        ctrl,
        existDb,
        newCl,
        headersName,
        rowsJson
      )
    } else {
      /**
       * 表格数据添加到集合中
       */
      result = await this.createDocuments(ctrl, existDb, clName, rowsJson)
    }

    return result
  }
  /**
   * 存储管理对象的集合
   */
  private clMongoObj(ctrl) {
    let { mongoClient } = ctrl
    const cl = mongoClient.db(META_ADMIN_DB).collection(META_ADMIN_CL)

    return cl
  }

  private findSysColl(ctrl, existDb, clName) {
    let { mongoClient } = ctrl
    let sysCl = mongoClient.db(existDb.sysname).collection(clName)

    return sysCl
  }
  /**
   * 按名称查找文档列定义
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
      schema_tags: [],
      schema_default_tags: [],
      tags: [],
      usage: 0,
      operateRules: {
        scope: {
          unrepeat: false,
        },
        unrepeat: {
          database: {},
          collection: {},
          primaryKeys: [],
          insert: false,
        },
      },
    }

    const { clName, title, schema_id, clSpreadsheet } = info
    clTpl.name = clName
    clTpl.sysname = clName
    clTpl.title = title
    clTpl.schema_id = schema_id
    if (clSpreadsheet === 'yes') clTpl.spreadsheet = 'yes'

    return await modelCl.create(existDb, clTpl)
  }
  /**
   * 添加文档
   *
   * @param ctrl
   * @param existDb
   * @param clName
   * @param rowsJson
   * @returns
   */
  async createDocuments(ctrl, existDb, clName, rowsJson) {
    const modelDoc = new ModelDoc(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const docWebhook = createDocWebhook(process.env.TMW_APP_WEBHOOK)

    let finishRows = rowsJson.map((row) => {
      let newRow: any = {}
      for (let k in row) {
        let oneRow = _.get(row, k)
        if (typeof oneRow === 'number') oneRow = String(oneRow)
        _.set(newRow, k.split('.'), oneRow)
      }
      // 加工数据
      modelDoc.processBeforeStore(newRow, 'insert')

      return newRow
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
   * @param rowsJson
   * @returns
   */
  async createSpreadsheet(ctrl, tmwDb, tmwCl, headersName, rowsJson) {
    const modelSS = new ModelSpreadsheet(
      ctrl.mongoClient,
      ctrl.bucket,
      ctrl.client
    )

    const rows = rowsJson.reduce((rows, rowJson, index) => {
      const cells = {}
      headersName.forEach((name, index) => {
        if (rowJson[name]) cells['' + index] = { text: rowJson[name] }
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
