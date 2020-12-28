const log4js = require('@log4js-node/log4js-api')
const logger = log4js.getLogger('tms-mongodb-web')
const axios = require('axios')

const { PluginBase } = require('./base')

const ModelDoc = require('../mgdb/document')

/**
 * 发送数据插件
 * @extends PluginBase
 */
class PluginHttpSend extends PluginBase {
  constructor(...args) {
    super(...args)
    this.axiosInstance = axios.create()
  }
  validate() {
    return super.validate().then(() => {
      let { file, method, getUrl, getBody } = this
      if (!method || typeof method !== 'string')
        throw `插件文件[${file}]不可用，创建的PluginHttpSend插件未包含[method]属性`

      if (!['post', 'get'].includes(method))
        throw `插件文件[${file}]不可用，创建的PluginHttpSend插件[method=${method}]未提供有效值`

      if (!getUrl || typeof getUrl !== 'function')
        throw `插件文件[${file}]不可用，创建的PluginHttpSend插件未包含[getUrl]方法`

      if (method === 'post')
        if (!getBody || typeof getBody !== 'function')
          throw `插件文件[${file}]不可用，创建的PluginHttpSend插件未包含[getBody]方法`

      return true
    })
  }
}
/**
 * 发送集合中的文档数据
 * @extends PluginHttpSend
 */
class PluginHttpSendDocs extends PluginHttpSend {
  constructor(...args) {
    super(...args)
  }
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
   *
   * @requires {any} axios响应对象中的data对象
   */
  httpSend(ctrl, tmwCl) {
    let { getConfig, axiosInstance } = this

    let url = this.getUrl(ctrl, tmwCl)
    let config =
      getConfig && typeof getConfig === 'function' ? getConfig(ctrl, tmwCl) : {}

    logger.debug(`插件[name=${this.name}]向发送[${url}]发送数据`)
    if (this.method === 'post') {
      let body = this.getBody(ctrl, tmwCl)
      return axiosInstance.post(url, body, config).then(({ data }) => data)
    } else if (this.method === 'get') {
      return axiosInstance.get(url, config).then(({ data }) => data)
    }

    return Promise.reject(`不支持的请求方法[${method}]`)
  }
}

module.exports = { PluginHttpSend, PluginHttpSendDocs }
