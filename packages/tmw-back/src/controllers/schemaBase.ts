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
  reqDb
  clMongoObj

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
    let { scope, db: dbName } = this.request.query 

    let find: any = { type: 'schema' }

    let existDb
    if (dbName) existDb = await this.schemaHelper.findRequestDb()
    if (existDb) find['db.sysname'] = existDb.sysname

    find.scope = scope ? { $in: scope.split(',') } : 'document'
    
    if (!dbName && scope === 'document') find.db = null

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
    let { scope, db: database } = this.request.query
    scope = scope ? { $in: scope.split(',') } : 'document'

    let query: any = {}

    if (database) {
      query = {
        "$and": [
          { type: 'schema', scope },
          {"$or": [{ database }, { database: '' }, { database: null }]}
        ]
      }
      if (this.bucket) query['$and'].push({ bucket: this.bucket.name })
    } else {
      query = {
        type: 'schema',
        scope: scope
      }
      if (this.bucket) query.bucket = this.bucket.name
    }

    return this.clMongoObj
      .find(query, {
        projection: { _id: 1, title: 1, description: 1, scope: 1, db: 1 },
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
  /**
   * 指定数据库下新建文档列定义
   */
  async create() {
    const info = this.request.body
    if (this.bucket) info.bucket = this.bucket.name
    if (!info.name) return new ResultFault('文档列定义名称不允许为空')

    const dbName = info.database ? info.database : null 
    let existDb
    if (dbName) existDb = await this.schemaHelper.findRequestDb(true, dbName)
    
    let [flag, result] = await this.schemaHelper.createCl(existDb, info)

    if (!flag) {
      return new ResultFault(result)
    }

    info._id = result.insertedId

    return new ResultData(info)
  }
}

export default SchemaBase
