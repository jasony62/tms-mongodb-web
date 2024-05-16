import { ResultData, ResultFault } from 'tms-koa'
import { Base } from 'tmw-kit/dist/ctrl/index.js'
import SchemaHelper from './schemaHelper.js'
import _ from 'lodash'
import mongodb from 'mongodb'
const ObjectId = mongodb.ObjectId

/**
 * 集合列定义控制器基类
 * @extends Base
 */
class SchemaBase extends Base {
  schemaHelper
  reqDb
  clMongoObj

  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.schemaHelper = new SchemaHelper(this)
  }
  async tmsBeforeEach(): Promise<true | ResultFault> {
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    this.clMongoObj = this.schemaHelper.clMongoObj

    return true
  }
  /**
   * 完成信息列表
   */
  async list() {
    const { scope, db: dbName } = this.request.query
    if (!scope) return new ResultFault('参数不完整')

    const find: any = { type: 'schema' }

    if (dbName) {
      //会检查db的权限，若不通过报异常
      let existDb = await this.schemaHelper.findRequestDb()
      if (!existDb) return new ResultFault('参数错误，指定的数据库不存在')
      find['db.sysname'] = existDb.sysname
    } else {
      if (scope === 'document') find.db = null
    }

    // 适用范围
    find.scope = { $in: scope.split(',') }

    if (this.bucketObj) find.bucket = this.bucketObj.name

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
    let { scope, db: dbName } = this.request.query
    if (dbName) {
      //会检查db的权限，若不通过报异常
      let existDb = await this.schemaHelper.findRequestDb()
      if (!existDb) return new ResultFault('参数错误，指定的数据库不存在')
    }

    const schemas = await this.schemaHelper.listSimple(dbName, scope)

    return new ResultData(schemas)
  }
  /**
   * 根据标签查找信息列表
   */
  async listByTag() {
    let { tag } = this.request.query

    let find: any = { type: 'schema', tags: { $elemMatch: { $eq: tag } } }
    if (this.bucketObj) find.bucket = this.bucketObj.name

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
    // 会进行权限检查
    const schema = await this.schemaHelper.schemaById(id)

    return new ResultData(schema)
  }
  /**
   * 指定数据库下新建文档列定义
   */
  async create() {
    const info = this.request.body
    if (this.bucketObj) info.bucket = this.bucketObj.name
    if (!info.name) return new ResultFault('文档列定义名称不允许为空')

    if (!info.scope) info.scope = 'document'
    // 查询是否存在同名文档列定义
    const [existFlag, existResult] = await this.schemaHelper.schemaByName(info)
    if (!existFlag) return new ResultFault(existResult)

    const dbName = info.database ? info.database : null
    let existDb
    if (dbName) existDb = await this.schemaHelper.findRequestDb(true, dbName)

    let [flag, result] = await this.schemaHelper.createDocSchema(existDb, info)

    if (!flag) return new ResultFault(result)

    info._id = result.insertedId

    return new ResultData(info)
  }
  /**
   * 更新文档列定义
   */
  async update() {
    const { id } = this.request.query

    if (!id) return new ResultFault('参数不完整')

    // 会进行数据库访问权限检查
    const schema = await this.schemaHelper.schemaById(id)
    if (schema) return new ResultFault('参数错误')

    let info = this.request.body
    const { scope } = info
    info = _.omit(info, ['_id', 'scope', 'bucket'])
    if (typeof info.order !== 'number') info.order = 99999

    // 查询是否存在同名文档列定义
    const [flag, result] = await this.schemaHelper.schemaByName(info, scope, id)
    if (!flag) return new ResultFault(result)

    const query: any = { _id: new ObjectId(id), type: 'schema' }
    if (this.bucketObj) query.bucket = this.bucketObj.name

    return this.clMongoObj
      .updateOne(query, { $set: info }, { upsert: true })
      .then(() => {
        info.scope = scope
        return new ResultData(info)
      })
  }
}

export default SchemaBase
