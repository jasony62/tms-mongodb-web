import { loadConfig } from 'tmw-kit'
import { PluginHttpSendDocs } from 'tmw-kit/dist/model/plugin'
import * as path from 'path'

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址
const ConfigFile =
  process.env.TMW_PLUGIN_DOC_HTTP_SEND_CONFIG_NAME || './plugin/doc/http-send'

/**
 * 通过http发送集合中的文档数据到指定地址
 */
class HttpSendDocPlugin extends PluginHttpSendDocs {
  constructor(file) {
    super(file)
    this.name = 'doc-http-send'
    this.scope = 'document'
    this.amount = 'many'
    this.title = '发送数据'
    this.description = '通过http将集合中的文档数据发送指定地址。'
    this.beforeWidget = { name: 'external', url: '', size: '40%' }
  }
  /**
   * 返回http请求方法
   * @param ctrl 控制器实例
   * @param tmwCl 数据库集合定义实例
   */
  getMethod(ctrl, tmwCl) {
    const { widget } = ctrl.request.body
    const method = widget?.method
    return method
  }
  /**
   * 返回数据发送地址
   * @param ctrl 控制器实例
   * @param tmwCl 数据库集合定义实例
   * @returns
   */
  getUrl(ctrl, tmwCl) {
    const { widget } = ctrl.request.body
    const url = widget?.url
    return url
  }
  /**
   * 将指定的文档数据作为要发送的数据
   * @param ctrl 控制器实例
   * @param tmwCl 数据库集合定义实例
   * @returns
   */
  async getBody(ctrl, tmwCl) {
    const { widget } = ctrl.request.body
    const excludeId = widget?.excludeId

    const [ok, docs] = await this.findRequestDocs(ctrl, tmwCl)
    if (ok === false) throw Error(docs)

    /**清除_id字段*/
    if (excludeId === true) docs.forEach((doc) => delete doc._id)

    return docs
  }
  /**
   * 执行插件操作
   * @param ctrl 控制器实例
   * @param tmwCl 数据库集合定义实例
   * @returns
   */
  async execute(ctrl, tmwCl) {
    return await this.httpSend(ctrl, tmwCl).then((rspData) => {
      return rspData
    })
  }
}
/**
 * 创建插件实例
 * @param file
 * @returns
 */
export function createPlugin(file: any) {
  let config: any

  if (ConfigFile) config = loadConfig(ConfigDir, ConfigFile)

  if (config && typeof config === 'object') {
    let {
      widgetUrl,
      name,
      amount,
      bucket,
      db,
      cl,
      title,
      url,
      method,
      excludeId,
    } = config

    // const disabled = widgetUrl && widgetUrl.indexOf('http') === 0 ? false : true
    // if (disabled) return false

    return name.map((name, index) => {
      let newPlugin = new HttpSendDocPlugin(file)
      // name
      newPlugin.name = name
      // widgetUrl
      newPlugin.beforeWidget.url = widgetUrl

      // title
      if (Array.isArray(title) && index < title.length && title[index]) {
        newPlugin.title = title[index]
      }
      // amount
      if (Array.isArray(amount) && index < amount.length && amount[index]) {
        newPlugin.amount = amount[index]
      }
      // bucket
      if (Array.isArray(bucket) && index < bucket.length && bucket[index]) {
        newPlugin.bucketName = new RegExp(bucket[index])
      }
      // db
      if (Array.isArray(db) && index < db.length && db[index]) {
        newPlugin.dbName = new RegExp(db[index])
      }
      // cl
      if (Array.isArray(cl) && index < cl.length && cl[index]) {
        newPlugin.clName = new RegExp(cl[index])
      }
      // url
      if (Array.isArray(url) && index < url.length && url[index]) {
        newPlugin.beforeWidget.ui = { url: { value: url[index] } }
      }
      // method
      if (Array.isArray(method) && index < method.length && method[index]) {
        if (!newPlugin.beforeWidget.ui) newPlugin.beforeWidget.ui = {}
        newPlugin.beforeWidget.ui.method = { value: method[index] }
      }
      // excludeId
      if (
        Array.isArray(excludeId) &&
        index < excludeId.length &&
        excludeId[index]
      ) {
        if (!newPlugin.beforeWidget.ui) newPlugin.beforeWidget.ui = {}
        newPlugin.beforeWidget.ui.excludeId = {
          value: /true|yes|1/i.test(excludeId[index]),
        }
      }
      return newPlugin
    })
  } else {
    const WidgetUrl = process.env.TMW_PLUGIN_DOC_HTTP_SEND_WIDGET_URL
    // const disabled = WidgetUrl && WidgetUrl.indexOf('http') === 0 ? false : true
    // if (disabled) return false

    const newPlugin = new HttpSendDocPlugin(file)
    newPlugin.beforeWidget.url = WidgetUrl

    return newPlugin
  }
}
