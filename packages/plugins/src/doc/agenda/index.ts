import { loadConfig } from 'tmw-kit'
import { PluginBase } from 'tmw-kit/dist/model'
import * as path from 'path'
import axios from 'axios'
import { ModelDoc } from 'tmw-kit'

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址
const ConfigFile =
  process.env.TMW_PLUGIN_DOC_AGENDA_CONFIG_NAME || './plugin/doc/agenda'

/**
 * 根据指定的文档生成调度任务
 */
class AgendaDocPlugin extends PluginBase {
  axiosInstance

  constructor(file: string) {
    super(file)
    this.name = 'doc-agenda'
    this.title = '调度任务'
    this.description = '根据文档数据执行调度任务'
    this.scope = 'document'
    this.transData = 'more'
    this.beforeWidget = { name: 'external', url: '', size: '40%' }
    this.axiosInstance = axios.create()
  }

  /**
   * 执行http请求
   * @param method
   * @param url
   * @param body
   */
  private async sendHttp(method, url, body) {
    if (/get/i.test(method)) {
      return this.axiosInstance.get(url).then(({ data }) => data)
    } else if (/post/i.test(method)) {
      return this.axiosInstance.post(url, body).then(({ data }) => data)
    }
    throw Error(`不支持的HTTP方法【${method}】`)
  }

  async execute(ctrl: any, tmwCl: any) {
    const { widget } = ctrl.request.body
    const { AgendaContext } = ctrl.tmsContext
    if (!AgendaContext) {
      return { code: -1, msg: '没有可用的调度服务' }
    }
    const { agenda } = await AgendaContext.ins()
    if (!AgendaContext) {
      return { code: -1, msg: '没有可用的调度服务实例' }
    }

    const modelDoc = new ModelDoc(ctrl.mongoClient, ctrl.bucket, ctrl.client)

    const [ok, docsOrCause] = await this.findRequestDocs(ctrl, tmwCl)
    if (ok === false) return { code: 10001, msg: docsOrCause }

    let result = []
    switch (widget.action) {
      case 'create':
        // 执行任务
        for (let doc of docsOrCause) {
          let { name, interval, method, url, data, state } = doc
          if (state === 'running') continue
          // 定制任务
          agenda.define(name, async (job) => {
            await this.sendHttp(method, url, data)
          })
          await agenda.every(interval, name)
          // 更新任务状态
          let rst = await modelDoc.update(tmwCl, doc._id, { state: 'running' })
          result.push(rst)
        }
        break
      case 'cancel':
        // 取消任务
        for (let doc of docsOrCause) {
          let { name, state } = doc
          if (state === 'stop') continue
          await agenda.cancel({ name })
          // 更新任务状态
          let rst = await modelDoc.update(tmwCl, doc._id, { state: 'stop' })
          result.push(rst)
        }
        break
    }

    return { code: 0, result }
  }
}

export function createPlugin(file: string) {
  let config
  if (ConfigFile) config = loadConfig(ConfigDir, ConfigFile)
  if (config && typeof config === 'object') {
    let { widgetUrl, bucket, db, cl, title } = config
    const newPlugin = new AgendaDocPlugin(file)
    newPlugin.beforeWidget.url = widgetUrl

    if (bucket) newPlugin.bucketName = new RegExp(bucket)
    if (db) newPlugin.dbName = new RegExp(db)
    if (cl) newPlugin.clName = new RegExp(cl)

    if (title && typeof title === 'string') newPlugin.title = title

    return newPlugin
  }

  return false
}
