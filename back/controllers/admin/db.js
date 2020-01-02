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
    const client = this.mongoClient
    return client
      .db('tms_admin')
      .collection('mongodb_object')
      .deleteOne({ name: dbName, type: 'database' })
      .then(() => client.db(dbName).dropDatabase())
      .then(() => new ResultData('ok'))
  }
}
module.exports = Db
