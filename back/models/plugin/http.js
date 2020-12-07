const axios = require('axios')

const { PluginBase } = require('./base')

const ModelDoc = require('../mgdb/document')

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
   *
   * @returns {[]} {[]} 第1位：是否成功，第2位：错误信息或文档列表
   */
  async findRequestDocs(ctrl, tmwCl) {
    let docs

    const modelDoc = new ModelDoc(ctrl.bucket)
    const { docIds, filter } = ctrl.request.body
    if (docIds && Array.isArray(docIds) && docIds.length > 0) {
      let [success, docsOrCause] = await modelDoc.byIds(tmwCl, docIds)
      if (success === true) docs = docsOrCause
      else return [false, docsOrCause]
    } else if (typeof filter === 'string' && /ALL/i.test(filter)) {
      let [success, docsOrCause] = await modelDoc.list(tmwCl)
      if (success === true) docs = docsOrCause.docs
      else return [false, docsOrCause]
    } else {
      let [success, docsOrCause] = await modelDoc.list(tmwCl, { filter })
      if (success === true) docs = docsOrCause.docs
      else return [false, docsOrCause]
    }

    return [true, docs]
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
