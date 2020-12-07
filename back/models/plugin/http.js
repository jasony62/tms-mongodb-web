const axios = require('axios')

const { PluginBase } = require('./base')

/**
 * 发送数据插件
 * @extends PluginBase
 */
class PluginHttpSend extends PluginBase {
  constructor() {
    this.axiosInstance = axios.create()
  }
}
/**
 * 发送集合中的文档数据
 * @extends PluginHttpSend
 */
class PluginHttpSendDocs extends PluginHttpSend {
  /**
   * 根据请求中的条件获得要发送的文档
   * @param {object} ctrl
   * @param {object} tmwCl
   */
  async findRequestDocs(ctrl, tmwCl) {
    // 通过model中的方法返回数据
  }
  /**
   * 发送http请求
   * @param {object} ctrl - 调用插件的控制器对象
   * @param {object} tmwCl - 文档所在集合
   */
  async httpSend(ctrl, tmwCl) {
    let result

    let params = this.getParams(ctrl, tmwCl)
    let url = this.getUrl(ctrl, tmwCl)

    if (this.method === 'post') {
      result = await axiosInstance.post(url, params)
    } else if (this.method === 'get') {
      result = await axiosInstance.get(url, params)
    }

    return result
  }
}

module.exports = { PluginHttpSend, PluginHttpSendDocs }
