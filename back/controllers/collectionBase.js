const _ = require('lodash')
const { ResultData, ResultFault } = require('tms-koa')
const Base = require('./base')
const CollectionHelper = require('./CollectionHelper')
const ObjectId = require('mongodb').ObjectId
const modelColl = require('../models/mgdb/collection')

class CollectionBase extends Base {
  constructor(...args) {
    super(...args)
    this.colHelper = new CollectionHelper(this)
  }
  async tmsBeforeEach() {
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    this.clMongoObj = this.colHelper.clMongoObj

    return true
  }
  /**
   * 根据名称返回指定集合
   */
  async byName() {
    const existDb = await this.colHelper.findRequestDb()

    const { cl: clName } = this.request.query
    const query = { database: existDb.name, name: clName, type: 'collection' }
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
    const existDb = await this.colHelper.findRequestDb()
    const client = this.mongoClient
    const p1 = client
      .db(existDb.name)
      .listCollections({}, { nameOnly: true })
      .toArray()
      .then((collections) => collections.map((c) => c.name))

    const query = { type: 'collection', database: existDb.name }
    if (this.bucket) query.bucket = this.bucket.name
    const p2 = this.clMongoObj.find(query).toArray()

    return Promise.all([p1, p2]).then((values) => {
      const [rawClNames, tmsCls] = values
      const tmsClNames = tmsCls.map((c) => c.name)
      const diff = _.difference(rawClNames, tmsClNames)
      diff.forEach((name) => tmsCls.push({ name }))
      return new ResultData(tmsCls)
    })
  }
  /**
   *  检查集合名
   */
  _checkClName(clName) {
    let model = new modelColl()
    return model._checkClName(clName)
  }
  /**
   * 指定数据库下新建集合
   */
  async create() {
    const existDb = await this.colHelper.findRequestDb()

    const info = this.request.body
    info.type = 'collection'
    info.database = existDb.name
    if (this.bucket) info.bucket = this.bucket.name

    // 检查集合名
    let newName = this._checkClName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    info.name = newName[1]

    const client = this.mongoClient
    let mgdb = client.db(existDb.name)

    // 查询是否已存在同名集合
    const repeatCls = await mgdb
      .listCollections({ name: info.name }, { nameOnly: true })
      .toArray()
    if (repeatCls.length > 0) {
      return new ResultFault('已存在同名集合')
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
    const existDb = await this.colHelper.findRequestDb()

    let { cl: clName } = this.request.query
    let info = this.request.body

    // 格式化集合名
    let newClName = this._checkClName(info.name)
    if (newClName[0] === false) return new ResultFault(newClName[1])
    newClName = newClName[1]

    // 查询集合是否存在
    const client = this.mongoClient
    let repeatCls = await client
      .db(existDb.name)
      .listCollections({ name: clName }, { nameOnly: true })
      .toArray()
    if (repeatCls.length === 0) {
      return new ResultFault('指定的集合不存在')
    }

    const query = { database: existDb.name, name: clName, type: 'collection' }
    if (this.bucket) query.bucket = this.bucket.name
    const { _id, name, database, type, bucket, ...updatedInfo } = info
    const rst = await this.clMongoObj
      .updateOne(query, { $set: updatedInfo }, { upsert: true })
      .then((rst) => [true, rst.result])
      .catch((err) => [false, err.message])

    if (rst[0] === false) return new ResultFault(rst[1])
    if (newClName === clName) {
      return new ResultData(info)
    }
    // 更改集合名
    const rst2 = await this._rename(existDb.name, clName, newClName)

    if (rst2[0] === true) return new ResultData(info)
    else return new ResultFault(rst2[1])
  }
  /**
   * 修改集合名称
   */
  async rename() {
    const existDb = await this.colHelper.findRequestDb()

    let { cl: clName, newName } = this.request.query

    //格式化集合名
    newName = this._checkClName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    newName = newName[1]

    let rst = await this._rename(existDb.name, clName, newName)

    if (rst[0] === true) return new ResultData(rst[1])
    else return new ResultFault(rst[1])
  }
  /**
   *
   */
  async _rename(dbName, clName, newName) {
    const client = this.mongoClient
    // 检查是否已存在同名集合
    let equalNameSum = await this.clMongoObj
      .find({ name: newName, database: dbName, type: 'collection' })
      .count()
    if (equalNameSum !== 0) return [false, '集合名修改失败！已存在同名集合']

    // 修改集合名
    const query = { name: clName, database: dbName, type: 'collection' }
    if (this.bucket) query.bucket = this.bucket.name
    let clDb = client.db(dbName).collection(clName)
    return clDb
      .rename(newName)
      .then(() => this.clMongoObj.updateOne(query, { $set: { name: newName } }))
      .then((rst) => [true, rst.result])
      .catch((err) => [false, err.message])
  }
  /**
   * 删除集合
   */
  async remove() {
    let { db: dbName, cl: clName } = this.request.query

    // 如(果是系统自带集合不能删除
    if (
      (dbName === 'admin' && clName === 'system.version') ||
      (dbName === 'config' && clName === 'system.sessions') ||
      (dbName === 'local' && clName === 'startup_log') ||
      (dbName === 'tms_admin' && clName === 'mongodb_object')
    )
      return new ResultFault('系统自带集合，不能删除')

    const existDb = await this.colHelper.findRequestDb()

    const client = this.mongoClient
    const query = { name: clName, type: 'collection' }
    if (this.bucket) query.bucket = this.bucket.name

    return this.clMongoObj
      .deleteOne(query)
      .then(() => client.db(existDb.name).dropCollection(clName))
      .then(() => new ResultData('ok'))
      .catch((err) => new ResultFault(err.message))
  }
}

module.exports = CollectionBase
