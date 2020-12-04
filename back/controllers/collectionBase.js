const _ = require('lodash')
const { ResultData, ResultFault } = require('tms-koa')
const Base = require('./base')
const CollectionHelper = require('./collectionHelper')
const ObjectId = require('mongodb').ObjectId

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
    const { cl: clName } = this.request.query
    const query = {
      database: this.reqDb.name,
      name: clName,
      type: 'collection',
    }
    if (this.bucket) query.bucket = this.bucket.name

    return this.clMongoObj
      .findOne(query)
      .then((result) => result)
      .then((myCl) => {
        if (myCl.schema_id) {
          return this.clMongoObj
            .findOne({ type: 'schema', _id: new ObjectId(myCl.schema_id) })
            .then((schema) => {
              myCl.schema = schema
              delete myCl.schema_id
              return myCl
            })
        }
        delete myCl.schema_id
        return myCl
      })
      .then((myCl) => new ResultData(myCl))
  }
  /**
   * 指定库下所有的集合
   */
  async list() {
    const client = this.mongoClient
    const p1 = client
      .db(this.reqDb.sysname)
      .listCollections({}, { nameOnly: true })
      .toArray()
      .then((collections) => collections.map((c) => c.name))

    const query = { type: 'collection', database: this.reqDb.name }
    if (this.bucket) query.bucket = this.bucket.name
    const p2 = this.clMongoObj
      .find(query, { projection: { type: 0 } })
      .toArray()

    return Promise.all([p1, p2]).then((values) => {
      const [rawClNames, tmsCls] = values
      const tmsClNames = tmsCls.map((c) => c.name)
      const diff = _.difference(rawClNames, tmsClNames)
      diff.forEach((name) => tmsCls.push({ name }))
      return new ResultData(tmsCls)
    })
  }
  /**
   * 指定数据库下新建集合
   */
  async create() {
    const info = this.request.body
    info.type = 'collection'
    info.database = this.reqDb.name
    if (this.bucket) info.bucket = this.bucket.name

    // 检查集合名
    let newName = this.clHelper.checkClName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    info.name = newName[1]

    const client = this.mongoClient
    const mgdb = client.db(this.reqDb.sysname)

    // 查询是否已存在同名集合
    const repeatCls = await mgdb
      .listCollections({ name: info.name }, { nameOnly: true })
      .toArray()
    if (repeatCls.length > 0)
      return new ResultFault(`已存在同名集合[name=${info.name}]`)

    // 检查是否指定了用途
    let { usage } = info
    if (usage !== undefined) {
      if (![0, 1].includes(parseInt(usage)))
        return new ResultFault(`指定了不支持的集合用途值[usage=${usage}]`)
      info.usage = parseInt(usage)
    }

    return mgdb
      .createCollection(info.name)
      .then(() => this.clMongoObj.insertOne(info))
      .then((result) => new ResultData(result.ops[0]))
  }
  /**
   * 更新集合对象信息
   */
  async update() {
    let { cl: clName } = this.request.query
    let info = this.request.body

    // 格式化集合名
    let newClName = this.clHelper.checkClName(info.name)
    if (newClName[0] === false) return new ResultFault(newClName[1])
    newClName = newClName[1]

    // 查询集合是否存在
    const client = this.mongoClient
    let repeatCls = await client
      .db(this.reqDb.sysname)
      .listCollections({ name: clName }, { nameOnly: true })
      .toArray()
    if (repeatCls.length === 0) {
      return new ResultFault('指定的集合不存在')
    }

    const query = {
      database: this.reqDb.name,
      name: clName,
      type: 'collection',
    }
    if (this.bucket) query.bucket = this.bucket.name
    const { _id, name, database, type, bucket, usage, ...updatedInfo } = info
    const rst = await this.clMongoObj
      .updateOne(query, { $set: updatedInfo }, { upsert: true })
      .then((rst) => [true, rst.result])
      .catch((err) => [false, err.message])

    if (rst[0] === false) return new ResultFault(rst[1])
    if (newClName === clName) {
      return new ResultData(info)
    }
    // 更改集合名
    const rst2 = await this.clHelper.rename(this.reqDb, clName, newClName)

    if (rst2[0] === true) return new ResultData(info)
    else return new ResultFault(rst2[1])
  }
  /**
   * 修改集合名称
   */
  async rename() {
    let { cl: clName, newName } = this.request.query

    //格式化集合名
    newName = this.clHelper.checkClName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    newName = newName[1]

    let rst = await thi.colHelper.rename(this.reqDb, clName, newName)

    if (rst[0] === true) return new ResultData(rst[1])
    else return new ResultFault(rst[1])
  }
  /**
   * 删除集合
   */
  async remove() {
    let { db: dbName, cl: clName } = this.request.query

    // 如果是系统自带集合不能删除
    if (
      (dbName === 'admin' && clName === 'system.version') ||
      (dbName === 'config' && clName === 'system.sessions') ||
      (dbName === 'local' && clName === 'startup_log') ||
      (dbName === 'tms_admin' && clName === 'mongodb_object') ||
      (dbName === 'tms_admin' && clName === 'bucket') ||
      (dbName === 'tms_admin' && clName === 'bucket') ||
      (dbName === 'tms_admin' && clName === 'bucket_invite_log') ||
      (dbName === 'tms_admin' && clName === 'bucket_preset_object') ||
      (dbName === 'tms_admin' && clName === 'tms_app_data_action_log')
    )
      return new ResultFault('系统自带集合，不能删除')

    const client = this.mongoClient
    const query = { name: clName, type: 'collection' }
    if (this.bucket) query.bucket = this.bucket.name

    return this.clMongoObj
      .deleteOne(query)
      .then(() => client.db(this.reqDb.sysname).dropCollection(clName))
      .then(() => new ResultData('ok'))
      .catch((err) => new ResultFault(err.message))
  }
}

module.exports = CollectionBase
