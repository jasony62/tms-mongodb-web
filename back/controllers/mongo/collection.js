const _ = require('lodash')
const { Ctrl, ResultData, ResultFault } = require('tms-koa')
const { Context } = require('../../context')
const ObjectId = require('mongodb').ObjectId

class Collection extends Ctrl {
  /**
   * 指定库下所有的集合
   */
  async list() {
    let { db: dbName } = this.request.query
    const client = await Context.mongoClient()
    const p1 = client
      .db(dbName)
      .listCollections({}, { nameOnly: true })
      .toArray()
      .then(collections => collections.map(c => c.name))
    const clMongoObj = client.db('tms_admin').collection('mongodb_object')
    const p2 = clMongoObj
      .find({ type: 'collection', database: dbName })
      .toArray()
    return Promise.all([p1, p2]).then(values => {
      const [rawClNames, tmsCls] = values
      const tmsClNames = tmsCls.map(c => c.name)
      const diff = _.difference(rawClNames, tmsClNames)
      diff.forEach(name => tmsCls.push({ name }))
      return new ResultData(tmsCls)
    })
  }
  /**
   * 指定数据库下新建集合
   */
  async create() {
    let { db: dbName } = this.request.query
    const info = this.request.body
    info.type = 'collection'
    info.database = dbName
    const client = await Context.mongoClient()
    return client
      .db(dbName)
      .createCollection(info.name)
      .then(() => client.db('tms_admin').collection('mongodb_object'))
      .then(cl => cl.insertOne(info))
      .then(result => new ResultData(result.ops[0]))
  }
  /**
   * 删除指定数据库下的集合
   */
  remove() {
    return new ResultData('删除指定数据库下的集合')
  }
}
module.exports = Collection
