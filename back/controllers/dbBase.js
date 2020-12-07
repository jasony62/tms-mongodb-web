const _ = require('lodash')
const { ResultData, ResultFault } = require('tms-koa')
const Base = require('./base')
const DbHelper = require('./dbHelper')
const ObjectId = require('mongodb').ObjectId
const ModelDb = require('../models/mgdb/db')
const { nanoid } = require('nanoid')
/**
 * 数据库控制器基类
 * @extends Base
 */
class DbBase extends Base {
  constructor(...args) {
    super(...args)
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
    const query = { type: 'database' }
    if (this.bucket) query.bucket = this.bucket.name
    const tmsDbs = await this.clMongoObj
      .find(query, {
        projection: { type: 0 },
      })
      .sort({ top: -1 })
      .toArray()

    return new ResultData(tmsDbs)
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

    // 检查数据库名
    let modelDb = new ModelDb()
    let newName = modelDb.checkDbName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    info.name = newName[1]

    // 查询是否存在同名库
    let existTmwDb = await this.dbHelper.dbByName(info.name)
    if (existTmwDb)
      return new ResultFault(`已存在同名数据库[name=${info.name}]`)

    // 生成数据库系统名
    let existSysDb, sysname
    for (let tries = 0; tries <= 2; tries++) {
      sysname = nanoid(10)
      existSysDb = await this.dbHelper.dbBySysname(sysname)
      if (!existSysDb) break
    }
    if (existSysDb) return new ResultFault('无法生成有效数据库名称')

    info.sysname = sysname

    return this.clMongoObj
      .insertOne(info)
      .then((result) => new ResultData(result.ops[0]))
  }
  /**
   * 更新数据库对象信息
   */
  async update() {
    const beforeDb = await this.dbHelper.findRequestDb()

    let info = this.request.body
    let params = this.request.query

    // 检查数据库名
    let modelDb = new ModelDb()

    let newName
    if (info.name !== undefined) {
      newName = modelDb.checkDbName(info.name)
      if (newName[0] === false) return new ResultFault(newName[1])
      info.name = newName[1]
    }

    //修改集合查询
    const queryList = { database: params.db, type: 'collection' }

    // 修改集合值
    const updateList = { database: info.name }

    const rst = await this.clMongoObj.updateMany(queryList, {
      $set: updateList,
    })

    let { _id, bucket, ...updatedInfo } = info

    const query = { _id: ObjectId(beforeDb._id) }

    return this.clMongoObj
      .updateOne(query, { $set: updatedInfo })
      .then(() => new ResultData(info))
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
}

module.exports = DbBase
