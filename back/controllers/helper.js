/**
 * 控制器辅助类
 */
class Helper {
  constructor(ctrl) {
    this.ctrl = ctrl
  }
  /**
   * 存储管理对象的结合
   */
  get clMongoObj() {
    const client = this.ctrl.mongoClient
    const cl = client.db('tms_admin').collection('mongodb_object')

    return cl
  }
  /**
   * 获得请求的数据库
   *
   * @param {boolean} bThrowNotFound 如果不可访问是否抛出异常
   */
  async findRequestDb(bThrowNotFound = true, dbName = null) {
    if (!dbName) dbName = this.ctrl.request.query.db
    const query = { name: dbName, type: 'database' }
    if (this.ctrl.bucket) query.bucket = this.ctrl.bucket.name

    const db = await this.clMongoObj.findOne(query)

    if (bThrowNotFound && !db) throw Error('指定的数据库不可访问')

    return db
  }
}

module.exports = Helper
