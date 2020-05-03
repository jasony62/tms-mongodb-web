const { ResultData } = require('tms-koa')
const Base = require('./base')

class SchemaBase extends Base {
  constructor(...args) {
    super(...args)
  }
  async tmsBeforeEach() {
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    const client = this.mongoClient
    const cl = client.db('tms_admin').collection('mongodb_object')
    this.clMongoObj = cl

    return true
  }
  /**
   * 完成信息列表
   */
  async list() {
    let { scope } = this.request.query

    let find = { type: 'schema' }
    if (scope) {
      let scope2 = scope.split(',')
      find.scope = { $in: scope2 }
    } else {
      find.scope = 'document'
    }
    if (this.bucket) find.bucket = this.bucket.name

    return this.clMongoObj
      .find(find)
      .toArray()
      .then((schemas) => new ResultData(schemas))
  }
  /**
   * 简单信息列表
   */
  async listSimple() {
    let { scope } = this.request.query

    let query = { type: 'schema' }
    if (scope) {
      let scope2 = scope.split(',')
      query.scope = { $in: scope2 }
    } else {
      query.scope = 'document'
    }
    if (this.bucket) query.bucket = this.bucket.name

    return this.clMongoObj
      .find(query, {
        projection: { _id: 1, title: 1, description: 1, scope: 1 },
      })
      .toArray()
      .then((schemas) => new ResultData(schemas))
  }
}

module.exports = SchemaBase
