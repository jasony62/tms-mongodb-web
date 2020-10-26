const Base = require('../base')
const modelBase = require('../../models/mgdb/base')
const modelColl = require('../../models/mgdb/collection')
const modelDocu = require('../../models/mgdb/document')
const _ = require('lodash')
const ObjectId = require('mongodb').ObjectId
const log4js = require('log4js')
const logger = log4js.getLogger('mg-pool-plugin')

// 目前PluginCommon中的部分方法，实现的不够好，为了保证数据流容易理解，后期应将方法均改为纯函数
class PluginCommon extends Base {
  constructor(...args) {
    super(...args)
  }

  // 静态属性写法，目前处于提案，不宜使用
  static operateType = {
    insertOne: 'insertOne',
    insertMany: 'insertMany',
    remove: 'remove',
    updateOne: 'updateOne',
    updateMany: 'updateMany',
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
  static async recordActionLog(...params) {
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
      query: content.request.query,
      body: content.request.body
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
      case PluginCommon.operateType.updateMany:
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
              cl.updateOne({ _id: ObjectId(id) }, {
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
              cl.updateOne({ [quota]: ele[quota] }, {
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
      case PluginCommon.operateType.updateOne:
        logger.info('单次更新')
        const id = data._id
        delete data._id
        return cl.updateOne({ [quota]: quota === '_id' ? ObjectId(id) : data[quota] }, {
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
      find = PluginCommon._assembleFind(filter)
    }

    return find
  }
}

module.exports = PluginCommon