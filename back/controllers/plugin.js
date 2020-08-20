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
    const { pluginUrl, db, clName } = this.request.query
    const { filter, docIds } = this.request.body

    const existDb = await this.pluginHelper.findRequestDb(true, db)
    const cl = this.mongoClient.db(existDb.sysname).collection(clName)

    if (typeof pluginUrl !== 'string' || !pluginUrl.length) return Promise.resolve(new ResultFault('pluginUrl参数错误'))

    const pluginConfig = PluginConfig.ins()
    let type

    const arr = Object.keys(pluginConfig)
    for (let i = 0; i < arr.length; i++) {
      const key = arr[i]
      if (!pluginConfig[key].length) continue
      const currentRes = pluginConfig[key].map(ele => ele[0])
      type = currentRes.includes(pluginUrl) ? key : null
    }

    logger.info('type：', type)
    if (!type) return Promise.resolve(new ResultFault('pluginUrl参数错误'))
    
    const find = Plugin.getFindCondition(docIds, filter)
    let data = await cl.find(find).toArray()
    logger.info('data', data)


    return new Promise(async resolve => {

      let filename, pluginFn, args, res

      const pluginConfigs = pluginConfig[type]
      const currentConfig = pluginConfigs.find(ele => ele[0] === pluginUrl)
      if (Array.isArray(currentConfig) && currentConfig.length > 0) {
        [filename, ...args] = currentConfig
      } else if (typeof currentConfig === 'string') {
        filename = currentConfig
      } else {
        resolve(new ResultFault('plugin配置文件有误'))
      }

      let columns = await modelColl.getSchemaByCollection(existDb, clName)
      if (!columns) resolve(new ResultFault('指定的集合没有指定集合列'))
      console.log('columns', columns)

      if (!fs.existsSync(path.resolve(`${filename}.js`))) resolve(new ResultFault(`找不到${filename}文件`))
      pluginFn = require(path.resolve(filename))
      if (typeof pluginFn === 'function') {
        res = await pluginFn(data, columns)
      }

      // Plugin.checkCol()
      const oprateRes = await Plugin.operateData(res, cl)
      console.log('oprateRes', oprateRes)

      return oprateRes[0] ? resolve(new ResultData(oprateRes[1])) : resolve(new ResultFault(oprateRes[1]))
      
    })
  }

  static checkCol() {

  }

  static async operateData(data, cl) {
    // switch (data[0]) {
    //   case Plugin.operateType.insert:
    //   case Plugin.operateType.remove:
    //   case Plugin.operateType.update:
    //   case Plugin.operateType.find:
    // }
    return await cl[data[0]](data[1]).then(res => {
      return [true, res]
    }).catch(err => {
      return [false, err]
    })
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