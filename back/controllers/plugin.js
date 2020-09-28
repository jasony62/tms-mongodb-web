const {
  ResultFault,
  ResultObjectNotFound,
  ResultData
} = require('tms-koa')
const Base = require('./base')
const PluginConfig = require('../models/mgdb/plugin')
const PluginHelper = require('./pluginHelper')
const modelBase = require('../models/mgdb/base')
const modelColl = require('../models/mgdb/collection')
const _ = require('lodash')
const ObjectId = require('mongodb').ObjectId
const modelDocu = require('../models/mgdb/document')
const fs = require('fs')
const path = require('path')
const log4js = require('log4js')
const logger = log4js.getLogger('mg-pool')

class Plugin extends Base {
  constructor(...args) {
    super(...args)
    this.pluginHelper = new PluginHelper(this)
  }

  static operateType = {
    insertOne: 'insertOne',
    insertMany: 'insertMany',
    remove: 'remove',
    updateOne: 'updateOne',
    updateMany: 'updateMany',
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
    
    if (Object.prototype.toString.call(pluginCfg) !== '[object Object]' || !pluginCfg.url) return Promise.resolve(new ResultFault('pluginCfg参数错误'))

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
    
    const find = Plugin.getFindCondition(docIds, filter)
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
      if(currentConfig[1].docSchemas) params = await Plugin.getSchemas(existDb, clName)

      const axios = require("axios")
      let axiosInstance = axios.create()
      params.data = data
      
      if (cfg.method === 'post') {
        let path
        if (currentConfig[1].isNeedGetParams) path = Plugin.splitGetParams(this.request.query, cfg.url)
        await axiosInstance.post(path ? path.slice(0, path.length-1) : cfg.url, params).then(result => {
          res = result
        })
      } else {
        await axiosInstance.get(cfg.url, { params }).then(result => {
          res = result
        })
      }
      
      logger.info('res结果', res.data)
      const { code, data: dataRes, msg } = res.data
      if(code !== 0) return resolve(new ResultFault(msg))
      
      if(!dataRes.length) return resolve(new ResultData(dataRes))
      // Plugin.checkCol()
      const oprateRes = await Plugin.operateData(Plugin.operateType.updateMany, dataRes, cl)
      
      const { callback } = currentConfig[1]

      if (!oprateRes[0]) return resolve(new ResultFault(oprateRes[1]))

      if (!Plugin.isExistCallback(callback)[0]) return oprateRes[0] ? resolve(new ResultData(oprateRes[1])) : resolve(new ResultFault(oprateRes[1]))

      // 回调操作
      return Plugin.executeCallback(this, callback, oprateRes, params, cl, existDb, clName, resolve)
    })
  }


  /**
   * @description 接收外部接口的统一回调处理
   */
  async receive() {
    const { dbName, clName, module } = this.request.query
    const { event, eventType, list, msg } = this.request.body
    if(!dbName || !clName) return new ResultFault('缺少dbName或clName')
    if (!module) return new ResultFault('不存在该模块')
    if(!list.length) return new ResultData(msg || '暂无数据')

    const existDb = await this.pluginHelper.findRequestDb(true, dbName)
    const cl = this.mongoClient.db(existDb.sysname).collection(clName)
    
    let params
    

    logger.info('获取query参数',  this.request.query)
    logger.info('获取body参数',  this.request.body)

    // 读取receiveConfig配置
    const { receiveConfig: pluginConfig } = PluginConfig.ins()
    // logger.info('获取receiveConfig配置信息', pluginConfig)

    const currentCfg = pluginConfig[module].find(ele => ele.event === event && ele.eventType.includes(eventType))
    logger.info('获取当前接口配置信息', currentCfg)
    
    // 获取集合属性
    if(currentCfg.docSchemas) params = await Plugin.getSchemas(existDb, clName)

    const { callback, quota } = currentCfg
    
    // Plugin.checkCol()
    const oprateRes = await Plugin.operateData(Plugin.operateType.updateMany, list, cl, quota)
    if (!oprateRes[0]) return new ResultFault(oprateRes[1])

    // 日志记录
    let resLog = true
    if(!currentCfg.noActionLog) resLog = await Plugin.recordActionLog(list, currentCfg.name, existDb.name, existDb.sysname, clName)

    const resCB = Plugin.isExistCallback(callback)
    if(!resCB[0]) return new ResultData(resCB[1])

    return Plugin.executeCallback(this, callback, oprateRes, params, cl, existDb, clName, undefined, this.request.query)
  }

  /**
   * @description 日志记录
   * @param  {any} oDatas
   * @param  {String} operate_type
   * @param  {String}  dbname
   * @param  {String}  sysname
   * @param  {String}  clname
   * @param  {String}  operate_after_dbname
   * @param  {String}  operate_after_sysname
   * @param  {String}  operate_after_clname
   * @param  {Object}  operate_before_data
   */
  static async recordActionLog(...params){
    logger.info(`日志记录-${params[1]}`)
    // 记录日志
    let modelD = new modelDocu()
    return await modelD.dataActionLog(...params)
  }

  static splitGetParams(params, url) {
    let getParams = JSON.parse(JSON.stringify(params))
    getParams.dbName = params.db
    delete getParams.pluginCfg
    delete getParams.db
    let path = url + (url.includes('?') ? '&' : '?')
    Object.keys(getParams).forEach(key => {
      path += `${key}=${getParams[key]}&`
    })
    return path
  }

  static async getSchemas(existDb, clName) {
    let colObj = await modelColl.getCollection(existDb, clName)
    let docSchemas = _.get(colObj, ['schema', 'body', 'properties'], {})
    let colExtendProps = _.get(colObj, ['extensionInfo', 'info'], {})
    return {
      docSchemas,
      colExtendProps
    }
  }

  /**
   * @description 执行发送/接受的回调函数
   * @param {object} content 当前上下文
   * @param {function} callback 
   * @param {array} oprateRes 入库后的数据
   * @param {object} params 
   * @param {*} cl 
   * @param {*} existDb 
   * @param {*} clName 
   * @param {*} resolve 
   */
  static async executeCallback(content, callback, oprateRes, params = {}, cl, existDb, clName, resolve) {
    const { ctx, client, dbContext, mongoClient, mongoose } = content
    const { path, callbackName } = callback
    let currentCtro = require(path)
    let currentClass = new currentCtro(ctx, client, dbContext, mongoClient, mongoose)
    const options = {
      data: oprateRes[1], 
      docIds: oprateRes[2], 
      colExtendProps: params.colExtendProps, 
      cl, 
      existDb, 
      clName,
      query: content.request.query
    }
    const res = await currentClass[callbackName](options)
    return resolve ? resolve(res) : res
  }

  static isExistCallback(callback) {
    if (!callback || !_.isPlainObject(callback)) return [false, '当前接口无callback']
    const { path, callbackName } = callback
    if (!path && !callbackName) return [false, '请配置正确的path或callbackName']
    return [true, 'success']
  }

  /**
   * @description 对外部接口传过来的collection做校验
   */
  static checkCol() {

  }

  /**
   * @description 操作mongodb数据
   * @param {string} operateType - 操作类型，以静态属性operateType定义为准
   * @param {object} data - 新数据
   * @param {*} cl 
   * @param {string} quota - 更新mongodb指标 
   */
  static async operateData(operateType, data, cl, quota = '_id') {
    switch (operateType) {
      case Plugin.operateType.updateMany:
        logger.info('开始批量更新')
        let arr = []
        let docIds = []
        if (quota === '_id') {
          if (!Array.isArray(data)) [false, 'data must be a Array']
          data.forEach(ele => {
            const id = ele._id
            docIds.push(id)
            delete ele._id
            arr.push(
              cl.updateOne({_id: ObjectId(id)}, {
                $set: ele
              })
            )
          })
        } else {
          if (!Array.isArray(data)) [false, 'data must be a Array']
          data.forEach(ele => {
            const id = ele._id
            docIds.push(id)
            delete ele._id
            arr.push(
              cl.updateOne({[quota]: ele[quota]}, {
                $set: ele
              })
            )
          })
        }
        return Promise.all(arr).then(() => {
          logger.info('批量更新成功')
          return [true, data, docIds]
        }).catch(err => {
          logger.info('批量更新失败', err)
          return [false, err]
        })
      case Plugin.operateType.updateOne:
          logger.info('单次更新')
          const id = data._id
          delete data._id
          return cl.updateOne({[quota]: quota === '_id' ? ObjectId(id) : data[quota]}, {
                  $set: data
                }).then(res => {
                  return [true, res, id]
                }).catch(err => {
                  return [false, err]
                })
    }
    
  }

  /**
   * 组装 查询条件
   */
  static _assembleFind(filter, like = true) {
    let model = new modelBase()
    return model._assembleFind(filter, like)
  }

  static getFindCondition(docIds, filter) {
    let find = {}
    if (docIds && docIds.length > 0) {
      // 按选中删除
      const newIds = docIds.map(ele => new ObjectId(ele))

      find = {
        _id: {
          $in: newIds
        }
      }
    } else if (typeof filter === 'string' && _.toUpper(filter) === 'ALL') {
      // 清空表
      find = {}
    } else if (typeof filter === 'object') {
      // 按条件
      find = Plugin._assembleFind(filter)
    }
    
    return find
  }
}

Plugin.tmsAuthTrustedHosts = true
module.exports = Plugin