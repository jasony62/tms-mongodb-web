import { ResultData, ResultFault } from 'tms-koa'
import Base from 'tmw-kit/dist/ctrl/base'
import SchemaHelper from './schemaHelper'
import * as mongodb from 'mongodb'
const ObjectId = mongodb.ObjectId

/**
 * 集合列定义控制器基类
 * @extends Base
 */
class SchemaBase extends Base {
  schemaHelper

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

    let find: any = { type: 'schema' }
    find.scope = scope ? { $in: scope.split(',') } : 'document'

    if (this.bucket) find.bucket = this.bucket.name

    return this.clMongoObj
      .find(find)
      .sort('order', 1)
      .toArray()
      .then((schemas) => new ResultData(schemas))
  }
  /**
   * 简单信息列表，不包含schema定义
   */
  async listSimple() {
    let { scope } = this.request.query

    let query: any = { type: 'schema' }
    query.scope = scope ? { $in: scope.split(',') } : 'document'
    if (this.bucket) query.bucket = this.bucket.name

    return this.clMongoObj
      .find(query, {
        projection: { _id: 1, title: 1, description: 1, scope: 1 },
      })
      .sort('order', 1)
      .toArray()
      .then((schemas) => new ResultData(schemas))
  }
  /**
   * 根据标签查找信息列表
   */
  async listByTag() {
    let { tag } = this.request.query

    let find: any = { type: 'schema', tags: { $elemMatch: { $eq: tag } } }
    if (this.bucket) find.bucket = this.bucket.name

    return this.clMongoObj
      .find(find)
      .sort('order', 1)
      .toArray()
      .then((schemas) => new ResultData(schemas))
  }
  /**
   * 根据id查找schema
   */
  async get() {
    const { id } = this.request.query
    if (!id) return new ResultFault('参数不完整')

    const query: any = { _id: new ObjectId(id), type: 'schema' }
    if (this.bucket) query.bucket = this.bucket.name

    return this.clMongoObj
      .findOne(query)
      .then((schema) => new ResultData(schema))
  }
}

export default SchemaBase
