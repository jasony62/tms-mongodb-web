import { PluginBase } from 'tmw-kit/dist/model'
import { loadConfig, ModelDb, ModelCl, ModelDoc } from 'tmw-kit'
import { createDocWebhook } from 'tmw-kit/dist/webhook/document'
import * as path from 'path'
import * as _ from 'lodash'
import * as dayjs from 'dayjs'
import Debug from 'debug'

const debug = Debug('tmw:plugins:doc-import-collection')

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址
const ConfigFile =
  process.env.TMW_PLUGIN_DOC_IMPORT_COLLECTION_CONFIG_NAME ||
  './plugin/doc/import_collection'

/**
 * 导入集合
 */
class ImportPlugin extends PluginBase {
  DownloadHost: string

  constructor(file: string) {
    super(file)
    this.name = 'doc-import-collection'
    this.title = '导入集合'
    this.description = '在数据库下通过导入excel，新建schema，collection和文档。'
    this.scope = 'collection'
    this.amount = 'zero'
    this.beforeWidget = { name: 'external', url: '', size: '60%' }
  }

  async execute(ctrl: any) {
    let { file, fileName, headers: sheetHeader } = ctrl.request.body.widget
    const dbName = ctrl.request.query.db

    if (!file) return { code: 10001, msg: '文件上传失败' }

    if (!fileName) return { code: 10001, msg: '解析上传的文件名称失败' }
    fileName = fileName.substr(0, fileName.lastIndexOf('.')) 
    debug(`默认以文件名【${fileName}】做为文档列定义和集合的名称`)

    const modelDb = new ModelDb(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const existDb = await modelDb.byName(dbName)
    if (!existDb) return { code: 10001, msg: `数据库【${dbName}】不存在` }
    debug(`db info: ${JSON.stringify(existDb)}`)

    // 查询是否存在同名文档列定义
    const [existFlag, existResult] = await this.schemaByName(ctrl, existDb, fileName)
    if (!existFlag) return { code: 10001, msg: existResult }

    let rowsJson = JSON.parse(file)
    if (!Array.isArray(rowsJson) || rowsJson.length === 0)
      return { code: 10001, msg: '上传的文件数据为空或格式错误' }

    // 创建文档列定义
    const [schemaFlag, schemaRst] = await this.createDocSchema(ctrl, existDb, fileName, sheetHeader)
    if (!schemaFlag) return { code: 10001, msg: schemaRst }
    debug(`创建了文档列定义[id=${schemaRst}]`)

    const [clFlag, clRst] = await this.createCl(ctrl, existDb, fileName, schemaRst)
    if (!clFlag) return { code: 10001, msg: clRst }
    debug(
      `创建集合对象[db.name=${existDb.name}][db.sysname=${existDb.sysname}][name=${fileName}][sysname=${fileName}]`
    )

    const modelDoc = new ModelDoc(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const docWebhook = createDocWebhook(process.env.TMW_APP_WEBHOOK)

    let finishRows = rowsJson.map((row) => {
      let newRow: any = {}
      for (let k in row) {
        let oneRow = _.get(row, k)
        if (typeof oneRow === 'number')
          oneRow = String(oneRow)
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
      const rst = await this.findSysColl(ctrl, existDb, fileName)
        .insertMany(finishRows)
        .then(async (r) => {
          debug(`导入的数据已存储到[db=${existDb.name}][cl=${fileName}]`)
          await modelDoc.dataActionLog(r.ops, '创建', existDb.name, fileName)
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
   * 存储管理对象的集合
   */
  private clMongoObj(ctrl) {
    let { mongoClient } = ctrl
    const cl = mongoClient.db('tms_admin').collection('mongodb_object')

    return cl
  }

  private findSysColl(ctrl, existDb, fileName) {
    let { mongoClient } = ctrl
    let sysCl = mongoClient.db(existDb.sysname).collection(fileName)

    return sysCl
  }
  /**
   * 按名称查找文档列定义
   */
  async schemaByName(ctrl, existDb, fileName) {
    const find: any = {
      name: fileName,
      type: 'schema'
    }
    if (existDb) find['db.sysname'] = existDb.sysname
    if (ctrl.bucket) find.bucket = ctrl.bucket.name

    let existSchema = await this.clMongoObj(ctrl)
      .findOne(find, {
        projection: { _id: 1 }
      })

    if (existSchema) return [false, '已存在同名文档列定义']
    return [true]
  }
  /**
   * 新建文档列定义
   */
  async createDocSchema(ctrl, existDb, fileName, info) {
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
      order: 99999
      // TMW_CREATE_TIME,
    }

    let properties = {}
    for (const k of info) {
      if (k.indexOf('.') > -1) {
        const childKey = k.split('.')
        const setKey = []
        for (let i = 0; i < childKey.length-1; i++) {
          setKey.push(childKey[i])
          const childProperties = _.get(properties, setKey)
          if (i === 0 && !childProperties) {
            // 多节点头
            _.set(properties, setKey, { type: "object", title: childKey[i] })
            setKey.push('properties')
          } else {
            if (!childProperties)
              _.set(properties, setKey, {
                type: "object",
                title: childKey[i]
              })

            setKey.push('properties')
            if (i === childKey.length - 2) {
              // 多节点尾
              setKey.push(childKey[childKey.length-1])
              _.set(properties, setKey, {
                type: "string",
                title: childKey[childKey.length-1]
              })
            }
          }
        }
      } else {
        properties[k] = { type: "string", title: k }
      }
    }

    tpl.name = fileName
    tpl.title = fileName
    if (existDb) {
      tpl.db = { sysname: existDb.sysname, name: existDb.name }
    }
    if (ctrl.bucket) tpl.bucket = ctrl.bucket.name
    tpl.body.properties = properties
    tpl.TMW_CREATE_TIME = dayjs().format('YYYY-MM-DD HH:mm:ss')

    return this.clMongoObj(ctrl)
      .insertOne(tpl)
      .then((result) => [true, result.insertedId.toString()])
      .catch((err) => [false, err.message])
  }
  /**
   * 新建集合
   */
  async createCl(ctrl, existDb, fileName, schema_id) {
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
      }
    }
    clTpl.name = fileName
    clTpl.sysname = fileName
    clTpl.schema_id = schema_id
    return await modelCl.create(existDb, clTpl)
  }
}

export function createPlugin(file: string) {
  let config
  if (ConfigFile) config = loadConfig(ConfigDir, ConfigFile)
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
