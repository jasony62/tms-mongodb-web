const Base = require('./base')

// 数据库名正则表达式
const DB_NAME_RE = '^[a-zA-Z]+[0-9a-zA-Z_]{0,63}$'

class Db extends Base {
  /**
   *  检查数据库名
   */
  _checkDbName(dbName) {
    //格式化库名
    if (new RegExp(DB_NAME_RE).test(dbName) !== true)
      return [
        false,
        '库名必须以英文字母开头，可用英文字母或_或数字组合，最长64位',
      ]

    return [true, dbName]
  }
}

module.exports = Db
