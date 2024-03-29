import log4js from '@log4js-node/log4js-api'
import axios from 'axios'

import { PluginBase } from './base.js'

import ModelCol from '../model/collection.js'

const logger = log4js.getLogger('tms-mongodb-web')
/**
 * 发送数据插件
 * @extends PluginBase
 */
export abstract class PluginHttpSend extends PluginBase {
  axiosInstance

  constructor(file: string) {
    super(file)
    this.axiosInstance = axios.create()
  }

  validate() {
    return super.validate().then(() => {
      // let { file, method, getUrl, getBody } = this
      // if (!method || typeof method !== 'string')
      //   throw `插件文件[${file}]不可用，创建的PluginHttpSend插件未包含[method]属性`

      // if (!['post', 'get'].includes(method))
      //   throw `插件文件[${file}]不可用，创建的PluginHttpSend插件[method=${method}]未提供有效值`

      // if (!getUrl || typeof getUrl !== 'function')
      //   throw `插件文件[${file}]不可用，创建的PluginHttpSend插件未包含[getUrl]方法`

      // if (method === 'post')
      //   if (!getBody || typeof getBody !== 'function')
      //     throw `插件文件[${file}]不可用，创建的PluginHttpSend插件未包含[getBody]方法`

      return true
    })
  }

  abstract getMethod(ctrl: any, tmwCl: any)

  abstract getUrl(ctrl: any, tmwCl: any)

  abstract getBody(ctrl: any, tmwCl: any)
}
/**
 * 发送集合中的文档数据
 * @extends PluginHttpSend
 */
export abstract class PluginHttpSendDocs extends PluginHttpSend {
  getConfig

  constructor(file: string) {
    super(file)
  }
  /**
   * 根据请求中的条件获得要发送的文档定义
   * @param {object} ctrl
   * @param {object} tmwCl
   *
   * @returns {object} schemas
   */
  async findRequestSchema(ctrl, tmwCl) {
    let schemas

    const modelCl = new ModelCol(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    schemas = await modelCl.getSchemaByCollection(tmwCl)
    // if (!schemas) return new ResultFault('指定的集合没有指定集合列')

    return schemas
  }
  /**
   * 发送http请求
   * @param {object} ctrl - 调用插件的控制器对象
   * @param {object} tmwCl - 文档所在集合
   *
   * @requires {any} axios响应对象中的data对象
   */
  async httpSend(ctrl, tmwCl) {
    let { getConfig, axiosInstance } = this

    const url = this.getUrl(ctrl, tmwCl)
    let config =
      getConfig && typeof getConfig === 'function' ? getConfig(ctrl, tmwCl) : {}

    config = Object.assign(config, {
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })

    const method = this.getMethod(ctrl, tmwCl)

    logger.debug(`插件[${this.name}]向[${url}]接口用[${method}]方法发送数据`)

    try {
      switch (method) {
        case 'post':
          let body = await this.getBody(ctrl, tmwCl)
          return axiosInstance.post(url, body, config).then(({ data }) => data)
        case 'get':
          return axiosInstance.get(url, config).then(({ data }) => data)
        case 'delete':
          return axiosInstance.delete(url, config).then(({ data }) => data)
      }
      return Promise.reject(`插件[${this.name}]不支持的请求方法[${method}]`)
    } catch (e) {
      logger.warn(`插件[${this.name}]在[${url}]接口执行[${method}]方法异常`, e)
      return Promise.reject(e.message)
    }
  }
}
