const { ResultData } = require('tms-koa')
const Base = require('./base')
const SchemaHelper = require('./schemaHelper')

/**
 * 集合列定义控制器基类
 * @extends Base
 */
class SchemaBase extends Base {
  constructor(...args) {
    super(...args)
    this.schemaHelper = new SchemaHelper(this)
  }
  async tmsBeforeEach() {
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    this.clMongoObj = this.schemaHelper.clMongoObj

    return true
  }
  /**
   * 完成信息列表
   */
  async list() {
    let { scope } = this.request.query

    let find = { type: 'schema' }
    if (scope) {
      find.scope = { $in: scope.split(',') }
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
   * 简单信息列表，不包含schema定义
   */
  async listSimple() {
    let { scope } = this.request.query

    let query = { type: 'schema' }
    if (scope) {
      query.scope = { $in: scope.split(',') }
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
  /**
   * 根据标签查找信息列表
   */
  async listByTag() {
    let { tag } = this.request.query

    let find = { type: 'schema', tags: { $elemMatch: { $eq: tag } } }
    if (this.bucket) find.bucket = this.bucket.name

    return this.clMongoObj
      .find(find)
      .toArray()
      .then((schemas) => new ResultData(schemas))
  }
}

module.exports = SchemaBase
