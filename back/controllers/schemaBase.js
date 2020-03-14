const { Ctrl, ResultData } = require('tms-koa')

class SchemaBase extends Ctrl {
    constructor(...args) {
        super(...args)
    }
    /**
   * 完成信息列表
   */
  async list() {
    let { scope } = this.request.query

    let find = { type: 'schema' }
    if (scope) {
      let scope2 = scope.split(',')
      find.scope = {$in: scope2}
    } else {
      find.scope = "document"
    }
    const client = this.mongoClient
    return client
      .db('tms_admin')
      .collection('mongodb_object')
      .find(find)
      .toArray()
      .then(schemas => new ResultData(schemas))
  }
  /**
   * 简单信息列表
   */
  async listSimple() {
    let { scope } = this.request.query

    let find = { type: 'schema' }
    if (scope) {
      let scope2 = scope.split(',')
      find.scope = {$in: scope2}
    } else {
      find.scope = "document"
    }
    const client = this.mongoClient
    return client
      .db('tms_admin')
      .collection('mongodb_object')
      .find(
        find,
        { projection: { _id: 1, title: 1, description: 1, scope: 1 } }
      )
      .toArray()
      .then(schemas => new ResultData(schemas))
  }
}

module.exports = SchemaBase
