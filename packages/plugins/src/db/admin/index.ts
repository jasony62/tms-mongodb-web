import { PluginProfileScope, PluginProfileAmount } from 'tmw-data'
import { loadConfig, ModelDb } from 'tmw-kit'
import { PluginBase } from 'tmw-kit/dist/plugin/index.js'

import path from 'path'

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址
const ConfigFile =
  process.env.TMW_PLUGIN_DB_ADMIN_CONFIG_NAME || './plugin/db/admin'

/**
 * 账号管理
 */
class DbAdminPlugin extends PluginBase {
  constructor(file: string) {
    super(file)
    this.name = 'db-admin'
    this.title = '管理数据库'
    this.description = '执行数据库管理命令'
    this.scope = PluginProfileScope.database
    this.amount = PluginProfileAmount.one
    this.beforeWidget = { name: 'external', url: '', size: '40%' }
  }

  async execute(ctrl: any) {
    let { name, widget } = ctrl.request.body
    let { action, params } = widget

    const modelDb = new ModelDb(ctrl.mongoClient, ctrl.bucket, ctrl.client)

    const db = await modelDb.byName(name)
    if (!db) return { code: 10001, msg: `数据库【${name}】不存在` }

    switch (action) {
      case 'getProfiling':
        const profiling = await modelDb.getProfilingStatus(db)
        return { code: 0, msg: { profiling } }
      case 'setProfiling':
        const rst = await modelDb.setProfilingLevel(db, params)
        return { code: 0, msg: { setProfiling: rst } }
      case 'runCommand':
        const result = await modelDb.runCommand(db, params)
        return { code: 0, msg: { runCommand: result } }
    }

    return { code: 10001, msg: `不支持的操作【${action}】` }
  }
}

export async function createPlugin(file: string) {
  let config
  if (ConfigFile) config = await loadConfig(ConfigDir, ConfigFile)
  if (config && typeof config === 'object') {
    let { widgetUrl, bucket, db, cl, title } = config
    const newPlugin = new DbAdminPlugin(file)

    newPlugin.beforeWidget.url = widgetUrl

    if (bucket) newPlugin.bucketName = new RegExp(bucket)
    if (db) newPlugin.dbName = new RegExp(db)

    if (title && typeof title === 'string') newPlugin.title = title

    return newPlugin
  }

  return false
}
