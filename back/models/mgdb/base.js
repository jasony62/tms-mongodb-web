const { MongoContext } = require('tms-koa').Context
const moment = require('moment')
const APPCONTEXT = require('tms-koa').Context.AppContext
const TMWCONFIG = APPCONTEXT.insSync().appConfig.tmwConfig

class Base {
  constructor() { }
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
          } else if (val.feature === 'between') {
            if (Array.isArray(val.keyword) && val.keyword.length === 2) {
              find2 = { $gte: val.keyword[0], $lte: val.keyword[1] }
            }
          } else if (typeof val.keyword === 'string') {
            find2 = { $regex: val.keyword }
          }
        } else if (
          typeof val === 'object' &&
          !val.keyword &&
          typeof val.keyword !== 'undefined'
        ) {
          find2 = val.keyword
        } else if (typeof val === 'string') {
          find2 = { $regex: val }
        }

        if (typeof find2 !== 'undefined') find[fk] = find2
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
