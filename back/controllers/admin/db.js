const DbBase = require('../dbBase')
const { ResultData, ResultFault } = require('tms-koa')

class Db extends DbBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * 删除数据
   */
  async remove() {
    const dbName = this.request.query.db

    if (['admin', 'config', 'local', 'tms_admin'].includes(dbName))
      return new ResultFault('不能删除系统自带数据库')

    const client = this.mongoClient
    const cl = this.clMongoObj
    // 查找数据库下是否有集合，如果有则不能删除
    let colls = await cl
      .find({ database: dbName, type: 'collection' })
      .toArray()
    if (colls.length > 0)
      return new ResultFault('删除失败，此库中存在未删除的集合')

    return cl
      .deleteOne({ name: dbName, type: 'database' })
      .then(() => client.db(dbName).dropDatabase())
      .then(() => new ResultData('ok'))
  }
}
module.exports = Db
