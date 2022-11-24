import * as dayjs from 'dayjs'
import * as path from 'path'
import * as fs from 'fs'
import * as _ from 'lodash'
import { SchemaIter } from '../schema'
import { AES } from '../crypto'
/**
 * 定义过滤条件
 */
type FilterCondKeyword = {
  keyword: string
}
type FilterLike = {
  [column: string]: string | number | FilterCondKeyword
}
type FilterSimple = {
  [column: string]: any
}

let TMW_CONFIG
let cnfpath = path.resolve(process.cwd() + '/config/app.js')
if (fs.existsSync(cnfpath)) {
  TMW_CONFIG = require(process.cwd() + '/config/app').tmwConfig
} else {
  TMW_CONFIG = {
    TMW_APP_DEFAULT_CREATETIME: 'TMW_DEFAULT_CREATE_TIME',
    TMW_APP_DEFAULT_UPDATETIME: 'TMW_DEFAULT_UPDATE_TIME',
    TMW_APP_DATA_ACTION_LOG: 'N',
  }
}

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
   * 对插入到表中的数据进行加工
   * 如果指定了schema，需要根据schema进行检查和加工
   */
  processBeforeStore(data, type: string, schema?: any, existData?: any) {
    let current = dayjs().format('YYYY-MM-DD HH:mm:ss')
    let { tmwConfig } = this

    switch (type) {
      case 'insert':
        if (typeof data[tmwConfig.TMW_APP_DEFAULT_UPDATETIME] !== 'undefined')
          delete data[tmwConfig.TMW_APP_DEFAULT_UPDATETIME]
        data[tmwConfig.TMW_APP_DEFAULT_CREATETIME] = current
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
                let encrypted = AES.encrypt(
                  val,
                  process.env.TMW_APP_DATA_CIPHER_KEY
                )
                _.set(data, fullname, encrypted)
              }
            }
          }
        }
        break
      case 'update':
        if (typeof data[tmwConfig.TMW_APP_DEFAULT_CREATETIME] !== 'undefined')
          delete data[this.tmwConfig.TMW_APP_DEFAULT_CREATETIME]
        data[tmwConfig.TMW_APP_DEFAULT_UPDATETIME] = current
        /**根据schema处理数据 */
        if (schema && typeof schema === 'object' && existData) {
          /**
           * 所有密码格式的属性都需要加密存储
           * 只有数据发生变化时才会进行处理，避免对加密的数据加密
           */
          const schemaIter = new SchemaIter({
            type: 'object',
            properties: schema,
          })
          for (let schemaProp of schemaIter) {
            let { fullname, attrs } = schemaProp
            if (attrs.format === 'password') {
              let newVal = _.get(data, fullname)
              let oldVal = _.get(existData, fullname)
              if (newVal !== oldVal) {
                if (newVal && typeof newVal === 'string') {
                  let encrypted = AES.encrypt(
                    newVal,
                    process.env.TMW_APP_DATA_CIPHER_KEY
                  )
                  _.set(data, fullname, encrypted)
                }
              }
            }
          }
        }

        break
    }

    return data
  }
}

export default Base
