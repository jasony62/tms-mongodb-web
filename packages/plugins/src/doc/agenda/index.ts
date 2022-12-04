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
  jobFields // 文档中和调度任务对应的字段
  axiosInstance

  constructor(file: string) {
    super(file)
    this.name = 'doc-agenda'
    this.title = '调度任务'
    this.description = '根据文档数据执行调度任务'
    this.scope = 'document'
    this.amount = 'many'
    this.beforeWidget = { name: 'external', url: '', size: '40%' }
    this.axiosInstance = axios.create()
    this.jobFields = {}
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

    let result: any = { success: [] }
    const fail = (fieldName, doc) => {
      ;(result.error ?? []).push({ id: doc._id, reason: fieldName })
    }
    switch (widget.action) {
      case 'create':
        // 执行任务
        for (let doc of docsOrCause) {
          let name = doc[this.jobFields.name]
          if (!name || typeof name !== 'string') {
            fail('name', doc)
            continue
          }

          let interval = doc[this.jobFields.interval]
          if (!interval || typeof interval !== 'string') {
            fail('interval', doc)
            continue
          }

          let url = doc[this.jobFields.url]
          if (!url || typeof url !== 'string') {
            fail('url', doc)
            continue
          }

          let method = doc[this.jobFields.method]
          if (!method || typeof method !== 'string') {
            fail('method', doc)
            continue
          }

          let body = doc[this.jobFields.body]

          let state = doc[this.jobFields.state]
          if (!state || typeof state !== 'string') {
            fail('state', doc)
            continue
          }

          if (state === 'running') continue
          // 定制任务
          agenda.define(name, async (job) => {
            await this.sendHttp(method, url, body)
          })
          await agenda.every(interval, name)
          // 更新任务状态
          let rst = await modelDoc.update(tmwCl, doc._id, { state: 'running' })

          result.success.push({ id: doc._id, rst })
        }
        break
      case 'cancel':
        // 取消任务
        for (let doc of docsOrCause) {
          let name = doc[this.jobFields.name]
          if (!name || typeof name !== 'string') {
            fail('name', doc)
            continue
          }
          let state = doc[this.jobFields.state]
          if (!state || typeof state !== 'string') {
            fail('state', doc)
            continue
          }
          if (state === 'stop') continue

          await agenda.cancel({ name })
          // 更新任务状态
          let rst = await modelDoc.update(tmwCl, doc._id, { state: 'stop' })

          result.success.push({ id: doc._id, rst })
        }
        break
    }

    return { code: 0, msg: result.success }
  }
}

export function createPlugin(file: string) {
  let config
  if (ConfigFile) config = loadConfig(ConfigDir, ConfigFile)
  if (config && typeof config === 'object') {
    let { widgetUrl, bucket, db, cl, schema, title, jobFields } = config
    const newPlugin = new AgendaDocPlugin(file)
    newPlugin.beforeWidget.url = widgetUrl

    if (bucket) newPlugin.bucketName = new RegExp(bucket)
    if (db) newPlugin.dbName = new RegExp(db)
    if (cl) newPlugin.clName = new RegExp(cl)
    if (schema) newPlugin.schemaName = new RegExp(schema)

    if (title && typeof title === 'string') newPlugin.title = title

    newPlugin.jobFields = jobFields

    return newPlugin
  }

  return false
}
