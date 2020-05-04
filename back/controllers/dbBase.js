const _ = require('lodash')
const { ResultData, ResultFault } = require('tms-koa')
const Base = require('./base')
const ObjectId = require('mongodb').ObjectId
const modelDb = require('../models/mgdb/db')

class DbBase extends Base {
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
   *
   */
  async list() {
    const query = { type: 'database' }
    if (this.bucket) query.bucket = this.bucket.name
    const tmsDbs = await this.clMongoObj.find(query).sort({ top: -1 }).toArray()

    return new ResultData(tmsDbs)
  }
  /**
   * 置顶
   */
  async top() {
    let { id, type = 'up' } = this.request.query

    let top = type === 'up' ? '10000' : null
    const query = { _id: ObjectId(id) }
    if (this.bucket) query.bucket = this.bucket.name
    return this.clMongoObj
      .updateOne(query, { $set: { top } })
      .then((rst) => new ResultData(rst.result))
  }
  /**
   * 新建数据库
   *
   * 只有创建集合，创建数据库才生效
   */
  async create() {
    let info = this.request.body
    info.type = 'database'
    if (this.bucket) info.bucket = this.bucket.name

    // 检查集合名
    let model = new modelDb()
    let newName = model._checkDbName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    info.name = newName[1]

    let cl = this.clMongoObj
    // 查询是否存在同名库
    const query = { name: info.name, type: 'database' }
    let dbs = await cl.find(query).toArray()
    if (dbs.length > 0) {
      return new ResultFault('已存在同名数据库')
    }

    return cl.insertOne(info).then((result) => new ResultData(result.ops[0]))
  }
  /**
   * 更新数据库对象信息
   */
  async update() {
    const dbName = this.request.query.db
    let info = this.request.body
    let { _id, name, bucket, ...updatedInfo } = info
    const query = { name: dbName, type: 'database' }
    if (this.bucket) query.bucket = this.bucket.name

    return this.clMongoObj
      .updateOne(query, { $set: updatedInfo })
      .then(() => new ResultData(info))
  }
}
module.exports = DbBase
