const {
  ResultFault,
  ResultData
} = require('tms-koa')
const Base = require('../base')
const PluginConfig = require('../../models/mgdb/plugin')
const PluginHelper = require('./pluginHelper')
const _ = require('lodash')
const log4js = require('log4js')
const logger = log4js.getLogger('mg-pool-plugin')
const PluginCommon = require('./pluginCommon')

class Plugin extends Base {
  constructor(...args) {
    super(...args)
    this.pluginHelper = new PluginHelper(this)
  }


  /**
   * 获取插件db配置
   */
  async pluginDb() {
    const {
      sendConfig
    } = PluginConfig.ins()

    return new ResultData(sendConfig.db)
  }

  /**
   * 获取插件collection配置
   */
  async pluginCollection() {
    const {
      sendConfig
    } = PluginConfig.ins()

    return new ResultData(sendConfig.collection)
  }

  /**
   * 获取插件document配置
   */
  async pluginDocument() {
    const {
      sendConfig
    } = PluginConfig.ins()

    return new ResultData(sendConfig.document)
  }


  /**
   * @description 插件实现机制
   * @param {string} type
   */
  async commonExecute() {
    let { pluginCfg, db, clName } = this.request.query
    const { filter, docIds } = this.request.body
    pluginCfg = typeof pluginCfg === 'string' ? JSON.parse(pluginCfg) : {}

    const existDb = await this.pluginHelper.findRequestDb(true, db)
    const cl = this.mongoClient.db(existDb.sysname).collection(clName)

    if (({}).toString.call(pluginCfg) !== '[object Object]' || !pluginCfg.url) return Promise.resolve(new ResultFault('pluginCfg参数错误'))

    // 读取sendConfig配置
    const { sendConfig: pluginConfig } = PluginConfig.ins()
    let type

    const arr = Object.keys(pluginConfig)
    for (let i = 0; i < arr.length; i++) {
      const key = arr[i]
      if (!pluginConfig[key].length) continue
      const currentRes = pluginConfig[key].map(ele => ele[0] && ele[0].url)
      type = currentRes.includes(pluginCfg.url) ? key : null
    }

    if (!type) return Promise.resolve(new ResultFault('pluginCfg参数错误'))

    const find = PluginCommon.getFindCondition(docIds, filter)
    let data = await cl.find(find).toArray()


    return new Promise(async resolve => {

      let cfg = {},
        args,
        res,
        params = {}

      const pluginConfigs = pluginConfig[type]
      const currentConfig = pluginConfigs.find(ele => ele[0].url === pluginCfg.url)
      if (Array.isArray(currentConfig) && currentConfig.length > 0) {
        [cfg, ...args] = currentConfig
      } else if (typeof currentConfig === 'string') {
        cfg.url = currentConfig
      } else {
        resolve(new ResultFault('plugin配置文件有误'))
      }

      // 获取集合属性
      if(currentConfig[1].docSchemas) params = await PluginCommon.getSchemas(existDb, clName)
      logger.info('获取拓展属性信息', params.colExtendProps)

      const axios = require("axios")
      let axiosInstance = axios.create()
      params.data = data

      if (cfg.method === 'post') {
        let path
        if (currentConfig[1].isNeedGetParams) path = PluginCommon.splitGetParams(this.request.query, cfg.url)
        await axiosInstance.post(path ? path.slice(0, path.length - 1) : cfg.url, params).then(result => {
          res = result
        })
      } else {
        await axiosInstance.get(cfg.url, { params }).then(result => {
          res = result
        })
      }

      logger.info('res结果', res.data)
      const { code, data: dataRes, msg } = res.data
      if (code !== 0) return resolve(new ResultFault(msg))

      if (!dataRes.length) return resolve(new ResultData(dataRes))
      // PluginCommon.checkCol()
      const oprateRes = await PluginCommon.operateData(PluginCommon.operateType.updateMany, dataRes, cl)

      const { callback } = currentConfig[1]

      if (!oprateRes[0]) return resolve(new ResultFault(oprateRes[1]))

      if (!PluginCommon.isExistCallback(callback)[0]) return oprateRes[0] ? resolve(new ResultData(oprateRes[1])) : resolve(new ResultFault(oprateRes[1]))

      // 回调操作
      return PluginCommon.executeCallback(this, callback, oprateRes, params, cl, existDb, clName, resolve)
    })
  }

}

module.exports = Plugin