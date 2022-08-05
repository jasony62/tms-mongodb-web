const { MongoContext } = require('tms-koa').Context
const moment = require('moment')
const APPCONTEXT = require('tms-koa').Context.AppContext
const TMWCONFIG = APPCONTEXT.insSync().appConfig.tmwConfig

class Base {
  /**
   *
   * @param {object} bucket - 用户存储空间
   */
  constructor(bucket, client) {
    this.bucket = bucket
    this.client = client
  }
  /**
   * 组装 查询条件
   */
  assembleQuery(filter, like = true) {
    const fnKwRe = (keyword) => {
      let kws = keyword.split(/,|，/)
      return kws.length === 1 ? keyword : '(' + kws.join('|') + ')'
    }
    let query = {} // 要返回的mongodb查询条件
    let columns = Object.keys(filter) // 指定的查询列
    if (like === true) {
      for (let column of columns) {
        let cond = filter[column]
        let subQuery
        if (typeof cond === 'object' && cond.keyword !== undefined) {
          const { keyword, feature } = cond
          if (feature === 'start') {
            subQuery = { $regex: `^${fnKwRe(keyword)}` }
          } else if (feature === 'notStart') {
            subQuery = { $not: { $regex: `^${fnKwRe(keyword)}` } }
          } else if (feature === 'end') {
            subQuery = { $regex: `^.*${fnKwRe(keyword)}$` }
          } else if (feature === 'notEnd') {
            subQuery = { $not: { $regex: `^.*${fnKwRe(keyword)}$` } }
          } else if (feature === 'notLike') {
            subQuery = { $not: { $regex: fnKwRe(keyword) } }
          } else if (feature === 'in') {
            if (Array.isArray(keyword)) subQuery = { $in: keyword }
          } else if (feature === 'nin') {
            if (Array.isArray(keyword)) subQuery = { $nin: keyword }
          } else if (feature === 'between') {
            if (Array.isArray(keyword) && keyword.length === 2)
              subQuery = { $gte: keyword[0], $lte: keyword[1] }
          } else if (feature === 'eq') {
            subQuery = { $eq: keyword }
          } else if (feature === 'ne') {
            subQuery = { $ne: keyword }
          } else if (feature === 'exists') {
            if ([true, false].includes(keyword)) {
              subQuery = { $exists: keyword }
            }
          } else if (feature === 'all') {
            if (Array.isArray(keyword)) subQuery = { $all: keyword }
          } else if (feature === 'elemMatch') {
            if (
              Object.prototype.toString.call(keyword).toLowerCase() ===
              '[object object]'
            )
              subQuery = { $elemMatch: keyword }
          } else if (feature === 'size') {
            if (isNaN(keyword) === false) {
              subQuery = { $size: +keyword }
            }
          } else if (!feature && ![null, '', undefined].includes(keyword)) {
            if (typeof keyword === 'string') {
              subQuery = { $regex: fnKwRe(keyword) }
            } else if ([true, false].includes(keyword)) {
              subQuery = keyword
            } else if (isNaN(keyword) === false) {
              subQuery = keyword
            }
          }
        } else if (
          typeof cond === 'object' &&
          cond.keyword !== undefined &&
          !cond.keyword
        ) {
          // 为了支持boolean值和0？
          subQuery = cond.keyword
        } else if (typeof cond === 'string') {
          subQuery = { $regex: cond }
        } else if (typeof cond === 'number') {
          subQuery = cond
        }

        if (subQuery !== undefined) query[column] = subQuery
      }
    } else {
      for (let column of columns) {
        query[column] = filter[column]
      }
    }
    
    return query
  }
  /**
   * 将指定的page和size参数转换为skip和limit参互
   * @param {number} page
   * @param {number} size
   *
   * @return {object} 包含skip和limit的对象
   */
  toSkipAndLimit(page, size) {
    let skip = 0
    let limit = 0
    if (page && page > 0 && size && size > 0) {
      skip = (parseInt(page) - 1) * parseInt(size)
      limit = parseInt(size)
    }
    return { skip, limit }
  }
  /**
   *
   */
  async mongoClient() {
    return MongoContext.mongoClient()
  }
  /**
   * 对插入到表中的数据进行加工
   */
  beforeProcessByInAndUp(data, type) {
    let today = moment()
    let current = today.format('YYYY-MM-DD HH:mm:ss')

    if (type === 'insert') {
      if (typeof data[TMWCONFIG['TMS_APP_DEFAULT_UPDATETIME']] !== 'undefined')
        delete data[TMWCONFIG['TMS_APP_DEFAULT_UPDATETIME']]
      data[TMWCONFIG['TMS_APP_DEFAULT_CREATETIME']] = current
    } else if (type === 'update') {
      if (typeof data[TMWCONFIG['TMS_APP_DEFAULT_CREATETIME']] !== 'undefined')
        delete data[TMWCONFIG['TMS_APP_DEFAULT_CREATETIME']]
      data[TMWCONFIG['TMS_APP_DEFAULT_UPDATETIME']] = current
    }

    return data
  }
}

module.exports = Base
