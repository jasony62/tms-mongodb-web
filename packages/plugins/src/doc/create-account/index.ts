import { loadConfig } from 'tmw-kit'
import { PluginBase } from 'tmw-kit/dist/model'
import * as path from 'path'

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址
const ConfigFile =
  process.env.TMW_PLUGIN_DOC_CREATE_ACCOUNT_CONFIG_NAME || './plugin/doc/create_account'

/**
 * 账号管理
 */
class CreateAccountPlugin extends PluginBase {
  constructor(file: string) {
    super(file)
    this.name = 'doc-create-account'
    this.title = '创建账号'
    this.description = '通过管理员身份创建用户的账号'
    this.scope = 'document'
    this.amount = 'zero'
    this.beforeWidget = { name: 'external', url: '', size: '40%' }
  }

  async execute(ctrl: any, tmwCl: any) {
    const { MongodbModel } =
      await require('tms-koa-account/dist/models/store/mongodb')
    const Model = new MongodbModel(
      ctrl.mongoClient,
      tmwCl.db.sysname,
      tmwCl.sysname
    )

    try {
      await Model.processAndCreate(ctrl.request.body.widget)
      return { code: 0, msg: '创建账号成功' }
    } catch (e) {
      return { code: 10001, msg: e }
    }
  }
}

export function createPlugin(file: string) {
  let config
  if (ConfigFile) config = loadConfig(ConfigDir, ConfigFile)
  if (config && typeof config === 'object') {
    let { widgetUrl, bucket, db, cl, title } = config
    const newPlugin = new CreateAccountPlugin(file)
    newPlugin.beforeWidget.url = widgetUrl

    if (bucket) newPlugin.bucketName = new RegExp(bucket)
    if (db) newPlugin.dbName = new RegExp(db)
    if (cl) newPlugin.clName = new RegExp(cl)

    if (title && typeof title === 'string') newPlugin.title = title

    return newPlugin
  }

  return false

}
