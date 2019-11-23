const _ = require('lodash')
const { Ctrl, ResultData } = require('tms-koa')
const { Context } = require('../../context')

class Db extends Ctrl {
  /**
   *
   */
  async list() {
    const client = await Context.mongoClient()
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
   * 新建数据库
   *
   * 只有创建集合（foo），创建数据库才生效
   */
  async create() {
    let info = this.request.body
    info.type = 'database'
    const client = await Context.mongoClient()
    return client
      .db('tms_admin')
      .collection('mongodb_object')
      .insertOne(info)
      .then(result => new ResultData(result.ops[0]))
  }
  /**
   * 更新数据库对象信息
   */
  async update() {
    const dbName = this.request.query.db
    let info = this.request.body
    info = _.omit(info, ['_id', 'name'])
    const client = await Context.mongoClient()
    const db = client.db('tms_admin')
    return db
      .collection('mongodb_object')
      .updateOne(
        { name: dbName, type: 'database' },
        { $set: info },
        { upsert: true }
      )
      .then(() => new ResultData(info))
  }
  /**
   * 删除数据
   */
  async remove() {
    const dbName = this.request.query.db
    const client = await Context.mongoClient()
    return client
      .db('tms_admin')
      .collection('mongodb_object')
      .deleteOne({ name: dbName, type: 'database' })
      .then(() => client.db(dbName).dropDatabase())
      .then(() => new ResultData('ok'))
  }
}
module.exports = Db
