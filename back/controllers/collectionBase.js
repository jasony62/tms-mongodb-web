const _ = require('lodash')
const { ResultData, ResultFault } = require('tms-koa')
const Base = require('./base')
const CollectionHelper = require('./collectionHelper')
const ObjectId = require('mongodb').ObjectId
const ModelCl = require('../models/mgdb/collection')
const { nanoid } = require('nanoid')

/**
 * 集合控制器基类
 * @extends Base 控制器基类
 */
class CollectionBase extends Base {
  constructor(...args) {
    super(...args)
    this.clHelper = new CollectionHelper(this)
  }
  /** 执行每个方法前执行 */
  async tmsBeforeEach() {
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    // 请求中指定的db
    this.reqDb = await this.clHelper.findRequestDb()

    this.clMongoObj = this.clHelper.clMongoObj

    return true
  }
  /**
   * 根据名称返回指定集合
   */
  async byName() {
    const existCl = await this.clHelper.findRequestCl()

    if (existCl.schema_id) {
      await this.clMongoObj
        .findOne({ type: 'schema', _id: new ObjectId(existCl.schema_id) })
        .then(schema => {
          existCl.schema = schema
          delete existCl.schema_id
          return existCl
        })
    }
    return new ResultData(existCl)
  }
  /**
   * 指定库下所有的集合，包含未被管理的集合
   */
  async list() {
    const query = { type: 'collection', 'db.sysname': this.reqDb.sysname }
    if (this.bucket) query.bucket = this.bucket.name
    const { keyword } = this.request.query
    if (keyword) {
      let re = new RegExp(keyword)
      query['$or'] = [
        { name: { $regex: re, $options: 'i' } },
        { title: { $regex: re, $options: 'i' } },
      ]
    }
    const options = {
      projection: { type: 0 },
    }
    let { skip, limit } = this.clHelper.requestPage()
    // 添加分页条件
    if (typeof skip === 'number') {
      options.skip = skip
      options.limit = limit
    }

    const tmwCls = await this.clMongoObj.find(query, options).toArray()

    if (typeof skip === 'number') {
      let total = await this.clMongoObj.countDocuments(query)
      return new ResultData({ collections: tmwCls, total })
    }

    return new ResultData(tmwCls)
  }
  /**
   * 指定数据库下新建集合
   */
  async create() {
    const info = this.request.body
    info.type = 'collection'
    info.database = this.reqDb.name
    info.db = { sysname: this.reqDb.sysname, name: this.reqDb.name }
    if (this.bucket) info.bucket = this.bucket.name

    let modelCl = new ModelCl()

    // 检查指定的集合名
    let [passed, nameOrCause] = modelCl.checkClName(info.name)
    if (passed === false) return new ResultFault(nameOrCause)
    info.name = nameOrCause

    // 查询是否已存在同名集合
    let existTmwCl = await modelCl.byName(this.reqDb, info.name)
    if (existTmwCl)
      return new ResultFault(
        `数据库[name=${this.reqDb.name}]中，已存在同名集合[name=${info.name}]`
      )

    // 检查是否指定了用途
    let { usage } = info
    if (usage !== undefined) {
      if (![0, 1].includes(parseInt(usage)))
        return new ResultFault(`指定了不支持的集合用途值[usage=${usage}]`)
      info.usage = parseInt(usage)
    }

    // 生成数据库系统名
    let existSysCl, sysname
    for (let tries = 0; tries <= 2; tries++) {
      sysname = nanoid(10)
      existSysCl = await modelCl.bySysname(this.reqDb, sysname)
      if (!existSysCl) break
    }
    if (existSysCl) return new ResultFault('无法生成唯一的集合系统名称')

    info.sysname = sysname

    /**在系统中创建集合后记录集合对象信息 */
    const client = this.mongoClient
    const mgdb = client.db(this.reqDb.sysname)

    return mgdb
      .createCollection(info.sysname)
      .then(() => this.clMongoObj.insertOne(info))
      .then(result => new ResultData(result.ops[0]))
  }
  /**
   * 更新集合对象信息
   */
  async update() {
    const existCl = await this.clHelper.findRequestCl()

    let info = this.request.body
    let { cl: clName } = this.request.query
    let modelCl = new ModelCl()

    // 格式化集合名
    // let newClName
    if (info.name && info.name !== clName) {
      let newClName = modelCl.checkClName(info.name)
      if (newClName[0] === false) return new ResultFault(newClName[1])
      // 查询是否已存在同名集合
      let existTmwCl = await modelCl.byName(this.reqDb, info.name)
      if (existTmwCl)
        return new ResultFault(
          `数据库[name=${this.reqDb.name}]中，已存在同名集合[name=${info.name}]`
        )
    }

    const {
      _id,
      sysname,
      database,
      db,
      type,
      bucket,
      usage,
      ...updatedInfo
    } = info

    const rst = await this.clMongoObj
      .updateOne({ _id: existCl._id }, { $set: updatedInfo })
      .then(rst => [true, rst.result])
      .catch(err => [false, err.message])

    if (rst[0] === false) return new ResultFault(rst[1])

    return new ResultData(info)
  }
  /**
   * 删除集合。如果集合中存在文档可以被删除吗？
   */
  async remove() {
    const existCl = await this.clHelper.findRequestCl()

    let { db, name: clName } = existCl

    // 如果是系统自带集合不能删除
    if (
      (db.sysname === 'admin' && clName === 'system.version') ||
      (db.sysname === 'config' && clName === 'system.sessions') ||
      (db.sysname === 'local' && clName === 'startup_log') ||
      (db.sysname === 'tms_admin' && clName === 'mongodb_object') ||
      (db.sysname === 'tms_admin' && clName === 'bucket') ||
      (db.sysname === 'tms_admin' && clName === 'bucket_invite_log') ||
      (db.sysname === 'tms_admin' && clName === 'bucket_preset_object') ||
      (db.sysname === 'tms_admin' && clName === 'tms_app_data_action_log') ||
      (db.sysname === 'tms_admin' && clName === 'replica_map')
    )
      return new ResultFault(`系统自带集合[${clName}]，不能删除`)

    const client = this.mongoClient

    return this.clMongoObj
      .deleteOne({ _id: existCl._id })
      .then(() => client.db(this.reqDb.sysname).dropCollection(existCl.sysname))
      .then(() => new ResultData('ok'))
      .catch(err => new ResultFault(err.message))
  }
}

module.exports = CollectionBase
