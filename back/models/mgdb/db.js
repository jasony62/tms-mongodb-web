const Base = require('./base')

class Db extends Base {
  /**
   *  检查集合名
   */
  _checkClName(clName) {
    //格式化库名
    if (clName.search(/[\u4E00-\u9FA5]|[\uFE30-\uFFA0]/gi) !== -1)
      return [false, '库名不能包含中文']

    let newName = clName.replace(/\s/g, '')

    //
    if (!newName) return [false, '库名不能为空']
    if (!isNaN(newName)) return [false, '库名不能全为数字']
    // 查询库名是否是mongodb自带数据库
    if (['admin', 'config', 'local'].includes(newName))
      return [false, '不能用mongodb自带数据库(admin, config, local)作为库名']

    return [true, newName]
  }
}

module.exports = Db
