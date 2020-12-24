const { ResultFault, ResultData } = require('tms-koa')
const axios = require('axios')
const Base = require('../base')
const PluginConfig = require('../../models/mgdb/plugin')
const PluginHelper = require('./pluginHelper')
const PluginCommon = require('./pluginCommon')
const log4js = require('log4js')
const logger = log4js.getLogger('mongodb-web')

class Send extends Base {
  constructor(...args) {
    super(...args)
    this.pluginHelper = new PluginHelper(this)
  }

  async exec(name, getParams, postParams) {
    const { dbName, clName } = getParams
    const { docIds, filter } = postParams
    const existDb = await this.pluginHelper.findRequestDb(true, dbName)
    const cl = this.mongoClient.db(existDb.sysname).collection(clName)
    // 读取sendConfig配置
    const { sendConfig: pluginConfig } = PluginConfig.ins()

    const find = PluginCommon.getFindCondition(docIds, filter)
    let data = await cl.find(find).toArray()

    return new Promise(async resolve => {
      let params = {},
        res
      const currentConfig = pluginConfig[name]

      if (!Array.isArray(currentConfig) || !currentConfig.length) {
        resolve(new ResultFault('plugin配置文件有误'))
      }

      // 获取集合属性
      if (currentConfig[1].docSchemas) {
        params = await PluginCommon.getSchemas(existDb, clName)
      }
      logger.info('获取拓展属性信息', params.colExtendProps)

      const axiosInstance = axios.create()
      params.data = data
      if (currentConfig[0].method === 'post') {
        let path
        if (currentConfig[1].isNeedGetParams) {
          const currentPath = PluginCommon.splitGetParams(
            getParams,
            currentConfig[0].url
          )
          path = currentPath.slice(0, currentPath.length - 1)
        }
        path = path ? path : currentConfig[0].url
        await axiosInstance.post(path, params).then(result => (res = result))
      } else {
        await axiosInstance
          .get(currentConfig[0].url, { params })
          .then(result => (res = result))
      }

      logger.info('res结果', res.data)
      const { code, data: dataRes, msg } = res.data
      if (code !== 0) return resolve(new ResultFault(msg))

      if (!dataRes.length) return resolve(new ResultData(dataRes))
      // PluginCommon.checkCol()
      const oprateRes = await PluginCommon.operateData(
        PluginCommon.operateType.updateMany,
        dataRes,
        cl
      )

      const { callback } = currentConfig[1]

      if (!oprateRes[0]) return resolve(new ResultFault(oprateRes[1]))

      if (!PluginCommon.isExistCallback(callback)[0])
        return oprateRes[0]
          ? resolve(new ResultData(oprateRes[1]))
          : resolve(new ResultFault(oprateRes[1]))

      // 回调操作
      return PluginCommon.executeCallback(
        this,
        callback,
        oprateRes,
        params,
        cl,
        existDb,
        clName,
        resolve
      )
    })
  }
}

module.exports = Send
