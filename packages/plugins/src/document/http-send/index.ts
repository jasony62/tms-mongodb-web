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
    this.method = 'post'
    this.disabled = WidgetUrl && WidgetUrl.indexOf('http') === 0 ? false : true
    this.beforeWidget = { name: 'external', url: WidgetUrl, size: '40%' }
  }
  /**
   * 返回数据发送地址
   * @param ctrl
   * @param tmwCl
   * @returns
   */
  getUrl(ctrl, tmwCl) {
    const { widget } = ctrl.request.body
    const url = widget?.url
    return url
  }
  /**
   * 将指定的文档数据作为要发送的数据
   * @param ctrl
   * @param tmwCl
   * @returns
   */
  getBody(ctrl, tmwCl) {
    return {}
  }

  async execute(ctrl, tmwCl) {
    return await this.httpSend(ctrl, tmwCl).then((rspData) => {
      // 获得url
      console.log('rrr', rspData)
      return rspData
    })
  }
}

export function createPlugin(file: any) {
  return new HttpSendDocPlugin(file)
}
