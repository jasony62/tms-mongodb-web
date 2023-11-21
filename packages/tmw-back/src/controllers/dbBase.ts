import { ResultData, ResultFault } from 'tms-koa'
import { Base } from 'tmw-kit/dist/ctrl/index.js'
import DbHelper from './dbHelper.js'
import { ModelDb } from 'tmw-kit'
import mongodb from 'mongodb'
const ObjectId = mongodb.ObjectId

/**
 * 数据库控制器基类
 * @extends Base
 */
class DbBase extends Base {
  dbHelper
  clMongoObj
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.dbHelper = new DbHelper(this)
  }
  async tmsBeforeEach() {
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    this.clMongoObj = this.dbHelper.clMongoObj

    return true
  }
  /**
   * 返回集合列表
   */
  async list() {
    const query: any = { type: 'database' }
    if (this.client.isAdmin !== true) {
      query.adminOnly = { $ne: true }
    }
    if (this.bucketObj) query.bucket = this.bucketObj.name
    let { keyword } = this.request.query
    if (keyword) {
      if (/\(/.test(keyword)) {
        keyword = keyword.replace(/\(/g, '\\(')
      }
      if (/\)/.test(keyword)) {
        keyword = keyword.replace(/\)/g, '\\)')
      }
      let re = new RegExp(keyword)
      query['$or'] = [
        { name: { $regex: re, $options: 'i' } },
        { title: { $regex: re, $options: 'i' } },
        { description: { $regex: re, $options: 'i' } },
        { tag: { $regex: re, $options: 'i' } },
      ]
    }
    const options: any = {
      projection: { type: 0 },
      sort: { top: -1, _id: -1 },
    }
    let { skip, limit } = this.dbHelper.requestPage()
    // 添加分页条件
    if (typeof skip === 'number') {
      options.skip = skip
      options.limit = limit
    }

    const tmwDbs = await this.clMongoObj.find(query, options).toArray()

    if (typeof skip === 'number') {
      let total = await this.clMongoObj.countDocuments(query)
      return new ResultData({ databases: tmwDbs, total })
    }

    return new ResultData(tmwDbs)
  }
  /**
   * 新建数据库
   *
   * 只有创建集合，创建数据库才生效
   */
  async create() {
    let info = this['request'].body
    if (this['bucket']) info.bucket = this.bucketObj.name

    let [flag, result] = await this['dbHelper'].dbCreate(info)

    if (!flag) {
      return new ResultFault(result)
    }

    return new ResultData(result)
  }
  /**
   * 更新数据库对象信息
   */
  async update() {
    let info = this['request'].body

    // 检查数据库名
    let modelDb = new ModelDb(
      this['mongoClient'],
      this.bucketObj,
      this['client']
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

    const rst = await this['clMongoObj'].updateMany(queryList, {
      $set: updateList,
    })

    let { _id, bucket, sysname, ...updatedInfo } = info

    const query = { _id: new ObjectId(_id) }

    return this['clMongoObj']
      .updateOne(query, { $set: updatedInfo })
      .then(() => new ResultData(info))
  }

  /**
   * 置顶
   */
  async top() {
    let { id, type = 'up' } = this['request'].query

    let top = type === 'up' ? '10000' : null
    const query: any = { _id: new ObjectId(id) }
    if (this['bucket']) query.bucket = this.bucketObj.name

    return this['clMongoObj']
      .updateOne(query, { $set: { top } })
      .then((rst) => new ResultData(rst.result))
  }
}

export default DbBase
