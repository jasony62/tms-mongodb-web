import { ResultData, ResultFault } from 'tms-koa'
import { CtrlBase } from './ctrlBase.js'
import DbHelper from './dbHelper.js'
import { ModelDb, ModelTagRelation } from 'tmw-kit'
import { ObjectId } from 'mongodb'

/**
 * 数据库控制器基类
 * @extends Base
 */
class DbBase extends CtrlBase {
  dbHelper
  clMongoObj
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.dbHelper = new DbHelper(this)
  }
  async tmsBeforeEach(): Promise<true | ResultFault> {
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    this.clMongoObj = this.dbHelper.clMongoObj

    return true
  }
  /**
   * 根据名称返回指定数据库
   */
  async byName() {
    let { name } = this.request.query

    const db = await this.dbHelper.dbByName(name)

    if (db.cl_schema_id) {
      await this.clMongoObj
        .findOne({ type: 'schema', _id: new ObjectId(db.cl_schema_id) })
        .then((schema) => {
          db.schema = schema
          delete db.cl_schema_id
          return db
        })
    }

    return new ResultData(db)
  }
  /**
   * 返回集合列表
   */
  async list() {
    let { filter } = this.request.body
    let { skip, limit } = this.dbHelper.requestPage()
    const result = await this.dbHelper.list(filter, skip, limit)

    return new ResultData(result)
  }
  /**
   * 新建数据库
   *
   * 只有创建集合，创建数据库才生效
   */
  async create() {
    let info = this.request.body
    if (this.bucketObj) info.bucket = this.bucketObj.name

    let [flag, result] = await this.dbHelper.dbCreate(info)

    if (!flag) {
      return new ResultFault(result)
    }

    return new ResultData(result)
  }
  /**
   * 更新数据库对象信息
   */
  async update() {
    const info = this.request.body

    // 检查数据库名
    const modelDb = new ModelDb(
      this.mongoClient,
      this.bucketObj?.name,
      this.client
    )

    let newName
    if (info.name !== undefined) {
      newName = modelDb.checkDbName(info.name)
      if (newName[0] === false) return new ResultFault(newName[1])
      info.name = newName[1]
    }

    //修改集合查询
    const queryList = { 'db.sysname': info.sysname, type: 'collection' }
    // 修改集合值
    const updateList = { database: info.name, 'db.name': info.name }
    // 更新所有相关集合的数据库名称
    await this.clMongoObj.updateMany(queryList, {
      $set: updateList,
    })

    /**
     * 清除不能修改的字段
     */
    const { _id, bucket, sysname, tags, ...updatedInfo } = info

    const query = { _id: new ObjectId(_id) }

    const result = await this.clMongoObj.updateOne(query, { $set: updatedInfo })
    /**
     * 更新标签
     */
    const modelTagRel = new ModelTagRelation(
      this.mongoClient,
      this.bucketObj?.name,
      this.client
    )
    const newTags = await modelTagRel.update('database', _id, tags)

    updatedInfo.tags = newTags

    return new ResultData(updatedInfo)
  }

  /**
   * 置顶
   */
  async top() {
    let { id, type = 'up' } = this.request.query

    let top = type === 'up' ? '10000' : null
    const query: any = { _id: new ObjectId(id) }
    if (this.bucketObj) query.bucket = this.bucketObj.name

    return this.clMongoObj
      .updateOne(query, { $set: { top } })
      .then((rst) => new ResultData(rst.result))
  }
}

export default DbBase
