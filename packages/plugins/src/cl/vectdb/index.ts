import { PluginProfileScope, PluginProfileAmount } from 'tmw-data'
import { loadConfig } from 'tmw-kit'
import { PluginBase } from 'tmw-kit/dist/plugin/index.js'
import path from 'path'
import _ from 'lodash'
import Debug from 'debug'

const debug = Debug('tmw:plugins:cl-vecdb')

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件名（不含扩展名）
const ConfigFile =
  process.env.TMW_PLUGIN_CL_VECDB_CONFIG_NAME || './plugin/cl/vecdb'

/**
 * 集合向量数据库
 */
class VecdbPlugin extends PluginBase {
  DownloadHost: string

  constructor(file: string) {
    super(file)
    this.name = 'cl-vecdb'
    this.title = '集合向量数据库'
    this.description = '给集合生成向量数据库。'
    this.scope = PluginProfileScope.collection
    this.amount = PluginProfileAmount.zero
    this.beforeWidget = { name: 'external', url: '', size: '60%' }
  }

  async execute(ctrl: any) {}
}

export async function createPlugin(file: string) {
  let config
  if (ConfigFile) config = await loadConfig(ConfigDir, ConfigFile)
  if (config && typeof config === 'object') {
    let { widgetUrl, bucket, db, title, disabled, dbBlacklist } = config
    const newPlugin = new VecdbPlugin(file)
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
