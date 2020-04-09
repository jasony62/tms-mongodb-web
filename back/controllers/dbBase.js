const _ = require('lodash')
const { Ctrl, ResultData, ResultFault } = require('tms-koa')
const ObjectId = require('mongodb').ObjectId
const modelDb = require('../models/mgdb/db')

class DbBase extends Ctrl {
  constructor(...args) {
    super(...args)
  }
  /**
   * 
   */
  async list() {
    const client = this.mongoClient
    const clMongoObj = client.db('tms_admin').collection('mongodb_object')
    const tmsDbs = await clMongoObj.find({ type: 'database' }).sort({top: -1}).toArray()

    return new ResultData(tmsDbs)
  }
  /**
   *  old 
   */
  async list2() {
    const client = this.mongoClient
    const adminDb = client.db().admin()
    const p1 = adminDb
      .listDatabases({ nameOnly: true })
      .then(result => result.databases.map(db => db.name))
    const clMongoObj = client.db('tms_admin').collection('mongodb_object')
    const p2 = clMongoObj.find({ type: 'database' }).toArray()
    return Promise.all([p1, p2]).then(values => {
      const [rawDbNames, tmsDbs] = values
      const tmsDbNames = tmsDbs.map(tmsDb => tmsDb.name)
      const diff = _.difference(rawDbNames, tmsDbNames)
      diff.forEach(name => tmsDbs.push({ name }))
      return new ResultData(tmsDbs)
    })
  }
  /**
   * 置顶
   */
  async top() {
    let { id, type = "up" } = this.request.query

    let top = (type === "up")? "10000" : null

    const client = this.mongoClient
    const clMongoObj = client.db('tms_admin').collection('mongodb_object')
    return clMongoObj
      .updateOne(
        { _id: ObjectId(id) },
        { $set: { top } }
      )
      .then((rst) => new ResultData(rst.result))
  }
  /**
   * 新建数据库
   *
   * 只有创建集合（foo），创建数据库才生效
   */
  async create() {
    let info = this.request.body
    info.type = 'database'

    // 检查集合名
    let model = new modelDb()
    let newName = model._checkClName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    info.name = newName[1] 

    const client = this.mongoClient
    let cl = client.db('tms_admin').collection('mongodb_object')
    
    // 查询是否存在同名库
    let dbs = await cl.find({ name: info.name, type: 'database' }).toArray()
    if (dbs.length > 0) {
      return new ResultFault("已存在同名数据库")
    }

    return cl
      .insertOne(info)
      .then(result => new ResultData(result.ops[0]))
  }
  /**
   * 更新数据库对象信息
   */
  async update() {
    const dbName = this.request.query.db
    let info = this.request.body
    let {_id, name, ...info2} = info
    const client = this.mongoClient
    const db = client.db('tms_admin')
    return db
      .collection('mongodb_object')
      .updateOne(
        { name: dbName, type: 'database' },
        { $set: info2 }
      )
      .then(() => new ResultData(info))
  }
}
module.exports = DbBase
