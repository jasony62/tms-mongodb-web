const { ResultFault, ResultData } = require('tms-koa')
const Base = require('../../base')
const PluginConfig = require('../../models/mgdb/plugin')
const PluginHelper = require('./pluginHelper')
const PluginCommon = require('./pluginCommon')
const _ = require('lodash')
const log4js = require('log4js')
const logger = log4js.getLogger('tms-mongo-web')

class Receive extends Base {
  constructor(...args) {
    super(...args)
    this.pluginHelper = new PluginHelper(this)
  }

  /**
   * @description 接收外部接口的统一回调处理
   */
  async receive() {
    const { dbName, clName, module } = this.request.query
    let { event, eventType, list, msg } = this.request.body
    if (!dbName || !clName) return new ResultFault('缺少dbName或clName')
    if (!module) return new ResultFault('不存在该模块')
    if (!list.length) return new ResultData(msg || '暂无数据')

    const existDb = await this.pluginHelper.findRequestDb(true, dbName)
    let cl = this.mongoClient.db(existDb.sysname).collection(clName)

    let params

    logger.info('获取query参数', this.request.query)
    logger.info('获取body参数', this.request.body)

    // 读取receiveConfig配置
    const { receiveConfig: pluginConfig } = PluginConfig.ins()
    // logger.info('获取receiveConfig配置信息', pluginConfig)

    const currentCfg = pluginConfig[module].find(
      ele => ele.event === event && ele.eventType.includes(eventType)
    )
    logger.info('获取当前接口配置信息', currentCfg)

    // 获取集合属性
    if (currentCfg.docSchemas)
      params = await PluginCommon.getSchemas(existDb, clName)

    const { callback, quota } = currentCfg

    // 入库前置操作
    const path = _.get(currentCfg, ['before', 'path'], null)
    const beforeName = _.get(currentCfg, ['before', 'beforeName'], null)
    if (path && beforeName) {
      let currentCtro = require(path)
      const res = await currentCtro[beforeName]({ list, cl })
      list = res.list
      cl = res.cl
    }

    // PluginCommon.checkCol()
    const oprateRes = await PluginCommon.operateData(
      PluginCommon.operateType.updateMany,
      list,
      cl,
      quota
    )
    if (!oprateRes[0]) return new ResultFault(oprateRes[1])

    const resCB = PluginCommon.isExistCallback(callback)
    if (!resCB[0] && !currentCfg.noActionLog)
      return (
        (await PluginCommon.recordActionLog(
          list,
          currentCfg.name,
          existDb.name,
          existDb.sysname,
          clName
        )) && new ResultData(resCB[1])
      )

    const afterRes = await PluginCommon.executeCallback(
      this,
      callback,
      oprateRes,
      params,
      cl,
      existDb,
      clName,
      undefined
    )
    if (afterRes.code === 0 && !currentCfg.noActionLog)
      await PluginCommon.recordActionLog(
        list,
        currentCfg.name,
        existDb.name,
        existDb.sysname,
        clName
      )
    return afterRes
  }
}

Receive.tmsAuthTrustedHosts = true
module.exports = Receive
