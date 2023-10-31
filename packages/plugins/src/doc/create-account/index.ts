import { PluginProfileScope, PluginProfileAmount } from 'tmw-data'
import { loadConfig, createDocWebhook } from 'tmw-kit'
import { PluginBase } from 'tmw-kit/dist/plugin/index.js'
import path from 'path'
import fs from 'fs'

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址
const ConfigFile =
  process.env.TMW_PLUGIN_DOC_CREATE_ACCOUNT_CONFIG_NAME ||
  './plugin/doc/create_account.js'

/**
 * 账号管理
 */
class CreateAccountPlugin extends PluginBase {
  docWebhook

  constructor(file: string) {
    super(file)
    this.name = 'doc-create-account'
    this.title = '创建账号'
    this.description = '通过管理员身份创建用户的账号'
    this.scope = PluginProfileScope.document
    this.amount = PluginProfileAmount.zero
    this.beforeWidget = { name: 'external', url: '', size: '40%' }
    this.docWebhook = createDocWebhook(process.env.TMW_APP_WEBHOOK_ACCOUNT)
  }

  async execute(ctrl: any, tmwCl: any) {
    const modelName = 'tms-koa-account/dist/models/store/mongodb'
    const { MongodbModel } = await import(modelName)
    const Model = new MongodbModel(
      ctrl.mongoClient,
      tmwCl.db.sysname,
      tmwCl.sysname
    )

    let account = ctrl.request.body.widget
    try {
      // 通过webhook处理数据
      let beforeRst = await this.docWebhook.beforeCreate(account, tmwCl)

      if (beforeRst.passed !== true)
        return {
          code: 10001,
          msg: beforeRst.reason || '操作被Webhook.beforeCreate阻止',
        }

      if (beforeRst.rewrited && typeof beforeRst.rewrited === 'object')
        account = beforeRst.rewrited

      let newAccount = await Model.processAndCreate(account)

      // 通过webhook处理数据
      let afterRst = await this.docWebhook.afterCreate(newAccount, tmwCl)
      if (afterRst.passed !== true)
        return {
          code: 10001,
          msg: afterRst.reason || '操作被Webhook.afterCreate阻止',
        }

      return { code: 0, msg: '创建账号成功' }
    } catch (e) {
      return { code: 10001, msg: e }
    }
  }
}

export async function createPlugin(file: string) {
  let config
  if (ConfigFile) config = await loadConfig(ConfigDir, ConfigFile)
  if (config && typeof config === 'object') {
    let {
      widgetUrl,
      bucket,
      db,
      cl,
      schema,
      title,
      schemaFile,
      disabled,
      dbBlacklist,
      clBlacklist,
      schemaBlacklist,
    } = config
    const newPlugin = new CreateAccountPlugin(file)

    let schemaJson
    const fp = path.resolve(ConfigDir, schemaFile)
    if (fs.statSync(fp).isFile())
      schemaJson = JSON.parse(fs.readFileSync(fp, 'utf-8'))
    if (!schemaJson) return false
    newPlugin.schemaJson = schemaJson

    newPlugin.beforeWidget.url = widgetUrl

    if (bucket) newPlugin.bucketName = new RegExp(bucket)
    if (db) newPlugin.dbName = new RegExp(db)
    if (cl) newPlugin.clName = new RegExp(cl)
    if (schema) newPlugin.schemaName = new RegExp(schema)

    if (title && typeof title === 'string') newPlugin.title = title

    if (disabled) newPlugin.disabled = disabled
    if (dbBlacklist) newPlugin.dbBlacklist = new RegExp(dbBlacklist)
    if (clBlacklist) newPlugin.clBlacklist = new RegExp(clBlacklist)
    if (schemaBlacklist) newPlugin.schemaBlacklist = new RegExp(schemaBlacklist)

    return newPlugin
  }

  return false
}
