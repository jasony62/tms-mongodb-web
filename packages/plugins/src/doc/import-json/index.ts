import { loadConfig, ModelSchema, ModelDoc } from 'tmw-kit'
import { createDocWebhook } from 'tmw-kit/dist/webhook/document'
import { PluginBase } from 'tmw-kit/dist/model'
import * as path from 'path'
/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址
const ConfigFile =
  process.env.TMW_PLUGIN_DOC_IMPORT_JSON_CONFIG_NAME ||
  './plugin/doc/import_json'
/**
 * 不通过表单，集合直接添加json数据
 */
class ImportDocJsonPlugin extends PluginBase {
  constructor(file: string) {
    super(file)
    this.name = 'doc-import-json'
    this.title = '导入文档(JSON)'
    this.description = '在集合中，直接导入json数据。'
    this.scope = 'document'
    this.amount = 'zero'
    this.beforeWidget = { name: 'external', url: '', size: '60%' }
  }

  /**
   * 获得管理集合对应的系统集合对象
   */
  private findSysColl(ctrl, tmwCl) {
    let { mongoClient } = ctrl
    let sysCl = mongoClient.db(tmwCl.db.sysname).collection(tmwCl.sysname)

    return sysCl
  }

  async execute(ctrl: any, tmwCl: any) {
    const { name: clName, schema_id, extensionInfo } = tmwCl

    let doc = ctrl.request.body.widget

    const modelSchema = new ModelSchema(
      ctrl.mongoClient,
      ctrl.bucket,
      ctrl.client
    )
    const modelDoc = new ModelDoc(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const docWebhook = createDocWebhook(process.env.TMW_APP_WEBHOOK)

    // 集合的schema定义
    let clSchema
    if (schema_id && typeof schema_id === 'string')
      clSchema = await modelSchema.bySchemaId(schema_id)

    // 补充公共属性
    if (extensionInfo) {
      const { info, schemaId } = extensionInfo
      if (schemaId) {
        const publicSchema = await modelSchema.bySchemaId(schemaId)
        Object.keys(publicSchema).forEach((schema) => {
          doc[schema] = info[schema] ? info[schema] : ''
        })
      }
    }

    // 加工数据
    modelDoc.processBeforeStore(doc, 'insert', clSchema)

    // 通过webhook处理数据
    let beforeRst: any = await docWebhook.beforeCreate(doc, tmwCl)

    if (beforeRst.passed !== true)
      return {
        code: 10001,
        msg: beforeRst.reason || '操作被Webhook.beforeCreate阻止',
      }

    if (beforeRst.rewrited && typeof beforeRst.rewrited === 'object')
      doc = beforeRst.rewrited

    // 在数据库中创建
    const newDoc = await this.findSysColl(ctrl, tmwCl)
      .insertOne(doc)
      .then(async (r) => {
        await modelDoc.dataActionLog(r.ops, '创建', tmwCl.db.name, clName)
        return doc
      })

    // 通过webhook处理数据
    let afterRst: any = await docWebhook.afterCreate(newDoc, tmwCl)
    if (afterRst.passed !== true)
      return {
        code: 10001,
        msg: afterRst.reason || '操作被Webhook.afterCreate阻止',
      }

    if (afterRst.rewrited && typeof afterRst.rewrited === 'object')
      doc = afterRst.rewrited

    return { code: 0, doc }
  }
}

export function createPlugin(file: string) {
  let config
  if (ConfigFile) config = loadConfig(ConfigDir, ConfigFile)
  if (config && typeof config === 'object') {
    let { widgetUrl, bucket, db, cl, schema, title } = config
    const newPlugin = new ImportDocJsonPlugin(file)
    newPlugin.beforeWidget.url = widgetUrl

    if (bucket) newPlugin.bucketName = new RegExp(bucket)
    if (db) newPlugin.dbName = new RegExp(db)
    if (cl) newPlugin.clName = new RegExp(cl)
    if (schema) newPlugin.schemaName = new RegExp(schema)

    if (title && typeof title === 'string') newPlugin.title = title

    return newPlugin
  }

  return false
}
