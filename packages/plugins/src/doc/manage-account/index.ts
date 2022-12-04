import { loadConfig } from 'tmw-kit'
import { PluginBase } from 'tmw-kit/dist/model'
import * as path from 'path'
import * as _ from 'lodash'
import { createDocWebhook } from 'tmw-kit/dist/webhook/document'

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址
const ConfigFile =
  process.env.TMW_PLUGIN_DOC_MANAGE_ACCOUNT_CONFIG_NAME ||
  './plugin/doc/manage_account'

/**
 * 账号管理
 */
class ManageAccountPlugin extends PluginBase {
  docWebhook

  constructor(file: string) {
    super(file)
    this.name = 'doc-manage-account'
    this.title = '账号管理'
    this.description = '账号管理，支持重置密码、禁用账号操作'
    this.scope = 'document'
    this.amount = 'one'
    this.beforeWidget = { name: 'external', url: '', size: '40%' }
    this.docWebhook = createDocWebhook(process.env.TMW_APP_WEBHOOK_ACCOUNT)
  }

  async execute(ctrl: any, tmwCl: any) {
    const { MongodbModel } =
      await require('tms-koa-account/dist/models/store/mongodb')
    const Model = new MongodbModel(
      ctrl.mongoClient,
      tmwCl.db.sysname,
      tmwCl.sysname
    )

    const { userInfo } = ctrl.request.body.widget

    const { username, password, forbidden } = userInfo

    if (!username) return { code: 10001, msg: '缺少账号参数' }

    const actRst = await Model.getAccount(username)
    if (!actRst) return { code: 10001, msg: '账号不存在' }

    try {
      // 修改密码
      if (password) {
        const {
          PasswordProcess: ProcessPwd,
        } = require('tms-koa-account/dist/models/processpwd')

        // 检查密码格式
        const pwdProcess = new ProcessPwd(password, actRst.salt)
        pwdProcess.options = { username }
        const checkRst = pwdProcess.pwdStrengthCheck()
        if (checkRst[0] === false) return { code: 10001, msg: checkRst[1] }

        userInfo.password = pwdProcess.hash

        let newInfo: any = _.pick(userInfo, ['username', 'password'])
        newInfo = _.pickBy(newInfo, (val) => val)
        newInfo.update_at = Date.now()
        await Model.updateOne({ _id: actRst._id }, newInfo)
      }

      // 禁（启）用账号
      if (forbidden != undefined && typeof forbidden != 'boolean')
        return { code: 10001, msg: '参数格式错误' }

      if (typeof forbidden === 'boolean') {
        await Model.updateOne(
          { _id: actRst._id },
          { forbidden, update_at: Date.now() }
        )
      }

      return { code: 0, msg: '操作成功' }
    } catch (error) {
      return { code: 10001, msg: `执行插件失败，原因：${error}` }
    }
  }
}

export function createPlugin(file: string) {
  let config
  if (ConfigFile) config = loadConfig(ConfigDir, ConfigFile)
  if (config && typeof config === 'object') {
    let { widgetUrl, bucket, db, cl, schema, title } = config
    const newPlugin = new ManageAccountPlugin(file)
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
