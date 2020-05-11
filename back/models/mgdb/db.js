const Base = require('./base')

class Db extends Base {
  /**
   *  检查数据库名
   */
  _checkDbName(dbName) {
    //格式化库名
    if (new RegExp('^[a-zA-Z]+[0-9a-zA-Z_]{0,9}$').test(dbName) !== true)
      return [false, '库名必须以小写英文字母开头，可与小写英文字母或_或数字组合，且最长64位']

    // 查询库名是否是mongodb自带数据库
    if (['admin', 'config', 'local'].includes(dbName))
      return [false, '不能用mongodb自带数据库(admin, config, local)作为库名']

    return [true, dbName]
  }
}

module.exports = Db
