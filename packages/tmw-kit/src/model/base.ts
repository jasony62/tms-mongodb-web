import * as dayjs from 'dayjs'
import * as _ from 'lodash'
import { SchemaIter } from '../schema'
import { AES } from '../crypto'
import { loadTmwConfig } from '../util'
/**
 * 定义过滤条件
 */
type FilterCondKeyword = {
  keyword: any
  feature: string
}
// 字符串时按正则表达式匹配
type FilterLike = {
  [column: string]: string | number | FilterCondKeyword
}
// 字段等于指定值的情况
type FilterSimple = {
  [column: string]: any
}

const TMW_CONFIG = loadTmwConfig()

class Base {
  mongoClient // mongodb连接客户端
  bucket // 指定的数据空间
  client // 执行操作的用户
  /**
   *
   * @param {object} bucket - 用户存储空间
   */
  constructor(mongoClient, bucket, client) {
    this.mongoClient = mongoClient
    this.bucket = bucket
    this.client = client
  }
  get tmwConfig() {
    return TMW_CONFIG
  }
  /**
   *
   * @param cond
   * @returns
   */
  private assembleLikeQuery(cond: FilterLike) {
    const fnKwRe = (keyword) => {
      let kws = keyword.split(/,|，/)
      return kws.length === 1 ? keyword : '(' + kws.join('|') + ')'
    }

    if (typeof cond === 'string') return { $regex: cond }
    else if (typeof cond === 'number') return cond

    if (cond && typeof cond !== 'object') return undefined

    let { keyword, feature } = cond as FilterCondKeyword

    // 没有指定keyword
    if (keyword === undefined) return undefined

    // boolean值的false和0
    if (!keyword) return cond.keyword

    if (!feature && ![null, '', undefined].includes(keyword)) {
      if (typeof keyword === 'string') {
        return { $regex: fnKwRe(keyword) }
      } else if ([true, false].includes(keyword)) {
        return keyword
      } else if (isNaN(keyword) === false) {
        return keyword
      }
    }

    let subQuery

    switch (feature) {
      case 'start':
        subQuery = { $regex: `^${fnKwRe(keyword)}` }
        break
      case 'notStart':
        subQuery = { $not: { $regex: `^${fnKwRe(keyword)}` } }
        break
      case 'end':
        subQuery = { $regex: `^.*${fnKwRe(keyword)}$` }
        break
      case 'notEnd':
        subQuery = { $not: { $regex: `^.*${fnKwRe(keyword)}$` } }
        break
      case 'notLike':
        subQuery = { $not: { $regex: fnKwRe(keyword) } }
        break
      case 'in':
        if (Array.isArray(keyword)) subQuery = { $in: keyword }
        break
      case 'nin':
        if (Array.isArray(keyword)) subQuery = { $nin: keyword }
        break
      case 'between':
        if (Array.isArray(keyword) && keyword.length === 2)
          subQuery = { $gte: keyword[0], $lte: keyword[1] }
        break
      case 'eq':
        subQuery = { $eq: keyword }
        break
      case 'ne':
        subQuery = { $ne: keyword }
        break
      case 'exists':
        if ([true, false].includes(keyword)) subQuery = { $exists: keyword }
        break
      case 'all':
        if (Array.isArray(keyword)) subQuery = { $all: keyword }
        break
      case 'elemMatch':
        if (
          Object.prototype.toString.call(keyword).toLowerCase() ===
          '[object object]'
        )
          subQuery = { $elemMatch: keyword }
        break
      case 'size':
        if (isNaN(keyword) === false) subQuery = { $size: +keyword }
        break
    }

    return subQuery
  }
  /**
   * 组装 查询条件
   */
  assembleQuery(filter: FilterSimple | FilterLike, like = true) {
    let query = {} // 要返回的mongodb查询条件
    let columns = Object.keys(filter) // 指定的查询列
    if (like === true) {
      for (let column of columns) {
        let cond: FilterLike = filter[column]
        let subQuery = this.assembleLikeQuery(cond)
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
   * 对插入到表中的数据进行加工
   * 如果指定了schema，需要根据schema进行检查和加工
   */
  processBeforeStore(data, type: string, schema?: any, existData?: any) {
    let current = dayjs().format('YYYY-MM-DD HH:mm:ss')
    let { tmwConfig } = this

    switch (type) {
      case 'insert':
        if (typeof data[tmwConfig.TMW_APP_UPDATETIME] !== 'undefined')
          delete data[tmwConfig.TMW_APP_UPDATETIME]
        data[tmwConfig.TMW_APP_CREATETIME] = current
        /**根据schema处理数据 */
        if (schema && typeof schema === 'object') {
          /**所有密码格式的属性都需要加密存储*/
          const schemaIter = new SchemaIter({
            type: 'object',
            properties: schema,
          })
          for (let schemaProp of schemaIter) {
            let { fullname, attrs } = schemaProp
            if (attrs.format === 'password') {
              let val = _.get(data, fullname)
              if (val && typeof val === 'string') {
                let test = AES.decrypt(val)
                if (!test) {
                  // 没有做过加密
                  let encrypted = AES.encrypt(val)
                  _.set(data, fullname, encrypted)
                }
              }
            }
          }
        }
        break
      case 'update':
        if (typeof data[tmwConfig.TMW_APP_CREATETIME] !== 'undefined')
          delete data[this.tmwConfig.TMW_APP_CREATETIME]
        data[tmwConfig.TMW_APP_UPDATETIME] = current
        /**根据schema处理数据 */
        if (schema && typeof schema === 'object' && existData) {
          /**
           * 所有密码格式的属性都需要加密存储
           * 只有数据发生变化时才会进行处理，避免对加密的数据加密
           * 如果已经是系统加密过的数据不会再次加密
           */
          const schemaIter = new SchemaIter({
            type: 'object',
            properties: schema,
          })
          for (let schemaProp of schemaIter) {
            let { fullname, attrs } = schemaProp
            if (attrs.format === 'password') {
              let newVal = _.get(data, fullname)
              if (newVal && typeof newVal === 'string') {
                // 设置过密码后，不能把密码改为空
                let test = AES.decrypt(newVal)
                if (!test) {
                  // 空字符串，没有做过加密处理
                  let oldVal = _.get(existData, fullname)
                  if (newVal !== oldVal) {
                    if (newVal && typeof newVal === 'string') {
                      let encrypted = AES.encrypt(newVal)
                      _.set(data, fullname, encrypted)
                    }
                  }
                }
              }
            }
          }
        }

        break
    }

    return data
  }

  /**
   * 存储管理对象的集合
   */
  get clMongoObj() {
    const client = this.mongoClient
    const cl = client.db('tms_admin').collection('mongodb_object')

    return cl
  }
}

export default Base
