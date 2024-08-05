import { PluginProfileScope, PluginProfileAmount } from 'tmw-data'
import { loadConfig } from 'tmw-kit'
import { PluginHttpSendDocs } from 'tmw-kit/dist/plugin/index.js'
import path from 'path'
import { jsonRender } from 'tms-handlebars'

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址
const ConfigFile =
  process.env.TMW_PLUGIN_DOC_HTTP_SEND_CONFIG_NAME || './plugin/doc/http-send'

class PluginReposi {
  url: string
  accesstoken: string
  db: string
  cl: string
  constructor(repois) {
    this.url = repois.url
    this.accesstoken = repois.accesstoken
    this.db = repois.db
    this.cl = repois.cl
  }

  load(configData) {
    const reposiUrl = `${this.url}/admin/document/list?db=${this.db}&cl=${this.cl}&access_token=${this.accesstoken}`
    return fetch(reposiUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        filter: { dbName: configData.dbName, clName: configData.clName },
      }),
    }).then((rsp) => {
      if (rsp.status === 200) {
        return rsp.json().then(({ result, code, msg }) => {
          if (code !== 0) throw Error('获取配置信息失败，原因：' + msg)
          if (Array.isArray(result.docs)) {
            if (result.docs.length === 1) {
              return result.docs[0]
            } else if (result.docs.length > 1) {
              throw Error('已保存的配置信息重复，请清理')
            } else {
              return null
            }
          }
        })
      }

      throw Error('获取配置信息失败，原因：' + rsp.statusText)
    })
  }

  save(configData) {
    const reposiUrl = `${this.url}/admin/document/create?db=${this.db}&cl=${this.cl}&access_token=${this.accesstoken}`

    this.load(configData).then((doc: any) => {
      if (doc) {
        if (doc._id) {
          const reposiUrl = `${this.url}/admin/document/update?db=${this.db}&cl=${this.cl}&access_token=${this.accesstoken}&id=${doc._id}`
          fetch(reposiUrl, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(configData),
          })
        }
      } else {
        fetch(reposiUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(configData),
        }).then((rsp) => {
          if (rsp.status === 200) {
            console.log('保存配置信息成功')
          } else {
            console.log('保存配置信息失败')
          }
        })
      }
    })
  }
}
/**
 * 通过http发送集合中的文档数据到指定地址
 */
class HttpSendDocPlugin extends PluginHttpSendDocs {
  /**
   * 保存http请求配置信息的位置
   */
  reposi: null | { url: string; accesstoken: string; db: string; cl: string }
  constructor(file) {
    super(file)
    this.name = 'doc-http-send'
    this.scope = PluginProfileScope.document
    this.amount = PluginProfileAmount.many
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
   *
   * @param ctrl
   * @param tmwCl
   * @returns
   */
  getHeaders(ctrl, tmwCl) {
    const { widget } = ctrl.request.body
    let headers = widget?.headers
    headers = headers ? JSON.parse(headers) : {}
    return headers
  }
  /**
   * 将指定的文档数据作为要发送的数据
   * @param ctrl 控制器实例
   * @param tmwCl 数据库集合定义实例
   * @returns
   */
  async getBody(ctrl, tmwCl) {
    const { widget } = ctrl.request.body
    let { excludeId, transformTpl } = widget ?? {}

    let [ok, docs] = await this.findRequestDocs(ctrl, tmwCl)
    if (ok === false) throw Error(docs)

    /**清除_id字段*/
    if (excludeId === true) {
      if (Array.isArray(docs)) docs.forEach((doc) => delete doc._id)
      else delete docs._id
    }
    /**数据转换*/
    if (transformTpl) {
      try {
        transformTpl = JSON.parse(transformTpl)
        docs = await jsonRender(transformTpl, { docs })
      } catch (e) {
        throw Error('根据模板转换发送数据失败，原因：' + e.message)
      }
    }

    return docs
  }

  /**
   * 执行插件操作
   *
   * @param ctrl 控制器实例
   * @param tmwCl 数据库集合定义实例
   * @returns
   */
  async execute(ctrl, tmwCl) {
    if (this.reposi && typeof this.reposi === 'object') {
      // 保存http配置信息
      this._saveConfig(ctrl, tmwCl)
    }
    return await this.httpSend(ctrl, tmwCl).then((rspData) => {
      return rspData
    })
  }
  /**
   * 配置信息保存的数据库中
   *
   * @param ctrl
   * @param tmwCl
   */
  private _saveConfig(ctrl: any, tmwCl: any) {
    const { reposi } = this
    const { widget } = ctrl.request.body
    const { url, method, headers, excludeId, transformTpl } = widget

    const configData = {
      dbName: tmwCl.db.name,
      clName: tmwCl.name,
      http: {
        url,
        method,
        headers,
        excludeId,
        transformTpl,
      },
    }
    new PluginReposi(reposi).save(configData)
  }
}
/**
 * 创建插件实例
 * @param file
 * @returns
 */
export async function createPlugin(file: any) {
  let config: any

  if (ConfigFile) config = await loadConfig(ConfigDir, ConfigFile)

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
      disabled,
      dbBlacklist,
      clBlacklist,
      schemaBlacklist,
      schema,
      reposiDb,
      reposiCl,
      reposiUrl,
      reposiAccessToken,
    } = config

    // const disabled = widgetUrl && widgetUrl.indexOf('http') === 0 ? false : true
    // if (disabled) return false

    return name.map((name, index) => {
      let newPlugin = new HttpSendDocPlugin(file)
      // name
      newPlugin.name = name
      // widgetUrl
      newPlugin.beforeWidget.url = widgetUrl

      if (
        Array.isArray(disabled) &&
        index < disabled.length &&
        disabled[index]
      ) {
        newPlugin.disabled = disabled[index]
      }
      if (
        Array.isArray(dbBlacklist) &&
        index < dbBlacklist.length &&
        dbBlacklist[index]
      ) {
        newPlugin.dbBlacklist = new RegExp(dbBlacklist[index])
      }
      if (
        Array.isArray(clBlacklist) &&
        index < clBlacklist.length &&
        clBlacklist[index]
      ) {
        newPlugin.clBlacklist = new RegExp(clBlacklist[index])
      }
      if (
        Array.isArray(schemaBlacklist) &&
        index < schemaBlacklist.length &&
        schemaBlacklist[index]
      ) {
        newPlugin.schemaBlacklist = new RegExp(schemaBlacklist[index])
      }
      if (Array.isArray(schema) && index < schema.length && schema[index]) {
        newPlugin.schemaName = new RegExp(schema[index])
      }
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
      // reposi
      if (reposiUrl && typeof reposiUrl === 'string') {
        if (reposiAccessToken && typeof reposiAccessToken === 'string') {
          if (reposiDb && typeof reposiDb === 'string') {
            if (reposiCl && typeof reposiCl === 'string') {
              newPlugin.reposi = {
                url: reposiUrl,
                accesstoken: reposiAccessToken,
                db: reposiDb,
                cl: reposiCl,
              }
            }
          }
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
