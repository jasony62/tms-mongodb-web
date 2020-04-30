const log4js = require('log4js')
const logger = log4js.getLogger('tms-xlsx-etd-models')
const MongoContext = require('tms-koa/lib/mongodb').Context
const moment = require('moment')
const TMSCONFIG = require('../../config')

class Base {
  constructor() {}
  /**
   * 组装 查询条件
   */
  _assembleFind(filter, like = true) {
    let find = {}
    let fKeys = Object.keys(filter)
    if (like === true) {
      for (let fk of fKeys) {
        let val = filter[fk]
        let find2
        if (typeof val === 'object' && val.keyword) {
          if (val.feature === 'start') {
            find2 = { $regex: '^' + val.keyword }
          } else if (val.feature === 'notStart') {
            find2 = { $not: { $regex: '^' + val.keyword } }
          } else if (val.feature === 'end') {
            find2 = { $regex: '^.*' + val.keyword + '$' }
          } else if (val.feature === 'notEnd') {
            find2 = { $not: { $regex: '^.*' + val.keyword + '$' } }
          } else if (val.feature === 'notLike') {
            find2 = { $not: { $regex: val.keyword } }
          } else if (val.feature === 'in') {
            if (Array.isArray(val.keyword)) {
              find2 = { $in: val.keyword }
            }
          } else {
            find2 = { $regex: val.keyword }
          }
        } else if (typeof val === 'object' && !val.keyword) {
        } else {
          find2 = { $regex: val }
        }

        if (find2) find[fk] = find2
      }
    } else {
      for (let fk of fKeys) {
        find[fk] = filter[fk]
      }
    }

    return find
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
  _beforeProcessByInAndUp(data, type) {
    let today = moment()
    let current = today.format('YYYY-MM-DD HH:mm:ss')

    if (type === 'insert') {
      if (typeof data[TMSCONFIG['TMS_APP_DEFAULT_UPDATETIME']] !== 'undefined')
        delete data[TMSCONFIG['TMS_APP_DEFAULT_UPDATETIME']]
      data[TMSCONFIG['TMS_APP_DEFAULT_CREATETIME']] = current
    } else if (type === 'update') {
      if (typeof data[TMSCONFIG['TMS_APP_DEFAULT_CREATETIME']] !== 'undefined')
        delete data[TMSCONFIG['TMS_APP_DEFAULT_CREATETIME']]
      data[TMSCONFIG['TMS_APP_DEFAULT_UPDATETIME']] = current
    }

    return data
  }
}

module.exports = Base
