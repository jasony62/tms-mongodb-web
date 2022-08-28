import { PluginHttpSendDocs } from 'tmw-kit/dist/model'

// 插件前端部件地址
const WidgetUrl = process.env.TMW_PLUGIN_DOCUMENT_HTTP_SEND

/**
 * 通过http发送集合中的文档数据到指定地址
 */
class HttpSendDocPlugin extends PluginHttpSendDocs {
  constructor(file) {
    super(file)
    this.name = 'http-send-doc'
    this.scope = 'document'
    this.transData = 'more' //'nothing:无/one:一条/more:多条'
    this.visible = {
      key: '',
      value: '',
    }
    this.title = '发送数据'
    this.description = '通过http将集合中的文档数据发送指定地址。'
    this.disabled = WidgetUrl && WidgetUrl.indexOf('http') === 0 ? false : true
    this.beforeWidget = { name: 'external', url: WidgetUrl, size: '40%' }
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

export function createPlugin(file: any) {
  return new HttpSendDocPlugin(file)
}
