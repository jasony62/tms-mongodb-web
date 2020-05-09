const Helper = require('./helper')
/**
 * 数据库控制器辅助类
 */
class DbHelper extends Helper {
  /**
   * 在系统范围内按名称查找数据库
   *
   * @param {string} sysname
   */
  async dbBySysname(sysname) {
    const query = { sysname, type: 'database' }

    const db = await this.clMongoObj.findOne(query)

    return db
  }
  /**
   * 在bucket范围内按名称查找数据库
   *
   * @param {string} name
   */
  async dbByName(name) {
    const query = { name, type: 'database' }
    if (this.ctrl.bucket) query.bucket = this.ctrl.bucket.name

    const db = await this.clMongoObj.findOne(query)

    return db
  }
}

module.exports = DbHelper
