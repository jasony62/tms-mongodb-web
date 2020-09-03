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
const fs = require('fs')
const path = require('path')
const log4js = require('log4js')
const logger = log4js.getLogger('tms-mongodb-web')

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
      db
    } = PluginConfig.ins()

    return new ResultData(db)
  }

  /**
   * 获取插件collection配置
   */
  async pluginCollection() {
    const {
      collection
    } = PluginConfig.ins()

    return new ResultData(collection)
  }

  /**
   * 获取插件document配置
   */
  async pluginDocument() {
    const {
      document
    } = PluginConfig.ins()

    return new ResultData(document)
  }


  /**
   * @name 插件实现机制
   * @param type db collection document
   */
  async commonExecute() {
    let { pluginCfg, db, clName } = this.request.query
    const { filter, docIds } = this.request.body
    pluginCfg = JSON.parse(pluginCfg)

    const existDb = await this.pluginHelper.findRequestDb(true, db)
    const cl = this.mongoClient.db(existDb.sysname).collection(clName)
    
    if (Object.prototype.toString.call(pluginCfg) !== '[object Object]' || !pluginCfg.url) return Promise.resolve(new ResultFault('pluginCfg参数错误'))

    const pluginConfig = PluginConfig.ins()
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
      if(currentConfig[1].docSchemas) {
        let colObj = await modelColl.getCollection(existDb, clName)
        let docSchemas = _.get(colObj, ['schema', 'body', 'properties'], {})
        let colExtendProps = _.get(colObj, ['extensionInfo', 'info'], {})
        params.docSchemas = docSchemas
        params.colExtendProps = colExtendProps
      }

      const axios = require("axios")
      let axiosInstance = axios.create()
      params.data = data
      
      logger.info('发送data', params)
      if (cfg.method === 'post') {
        await axiosInstance.post(cfg.url, params).then(result => {
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

      // Plugin.checkCol()
      const oprateRes = await Plugin.operateData(Plugin.operateType.updateMany, dataRes, cl)

      return oprateRes[0] ? resolve(new ResultData(oprateRes[1])) : resolve(new ResultFault(oprateRes[1]))
      
    })
  }

  static checkCol() {

  }

  static async operateData(operateType, data, cl) {
    switch (operateType) {
      case Plugin.operateType.updateMany:
        let obj = {}
        data.forEach((ele, index) => {
          let newData = {}
          Object.keys(ele).forEach(item => {
            if (item !== '_id') {
              newData[item] = ele[item]
            }
          })
          obj[index] = cl.updateOne({ _id: ObjectId(ele._id)}, {
            $set: newData
          })
        })
        return Promise.all(Object.keys(obj)).then(() => {
          return [true, data]
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

module.exports = Plugin