const _ = require('lodash')
const { Ctrl, ResultData } = require('tms-koa')
const MongoClient = require('mongodb').MongoClient

class Db extends Ctrl {
  /**
   *
   */
  list() {
    const url = 'mongodb://localhost:27017'
    return MongoClient.connect(url, { useUnifiedTopology: true }).then(
      client => {
        const adminDb = client.db().admin()
        const p1 = adminDb
          .listDatabases({ nameOnly: true })
          .then(result => result.databases.map(db => db.name))
        const clMongoObj = client.db('tms_admin').collection('mongodb_object')
        const p2 = clMongoObj.find({ type: 'database' }).toArray()
        return Promise.all([p1, p2])
          .then(values => {
            const [rawDbNames, tmsDbs] = values
            const tmsDbNames = tmsDbs.map(tmsDb => tmsDb.name)
            const diff = _.difference(rawDbNames, tmsDbNames)
            diff.forEach(name => tmsDbs.push({ name }))
            return new ResultData(tmsDbs)
          })
          .finally(() => client.close())
      }
    )
  }
  /**
   * 新建数据库
   *
   * 只有创建集合（foo），创建数据库才生效
   */
  create() {
    let info = this.request.body
    info.type = 'database'
    const url = `mongodb://localhost:27017`
    return MongoClient.connect(url, { useUnifiedTopology: true }).then(client =>
      client
        .db('tms_admin')
        .collection('mongodb_object')
        .insertOne(info)
        .then(result => new ResultData(result.ops[0]))
        .finally(() => {
          client.close()
        })
    )
  }
  /**
   * 更新数据库对象信息
   */
  update() {
    const dbName = this.request.query.db
    let info = this.request.body
    info = _.omit(info, ['_id', 'name'])
    const url = `mongodb://localhost:27017/tms_admin`
    return MongoClient.connect(url, { useUnifiedTopology: true }).then(
      client => {
        const db = client.db()
        return db
          .collection('mongodb_object')
          .updateOne(
            { name: dbName, type: 'database' },
            { $set: info },
            { upsert: true }
          )
          .then(() => new ResultData(info))
          .finally(() => {
            client.close()
          })
      }
    )
  }
  /**
   * 删除数据
   */
  remove() {
    const dbName = this.request.query.db
    const url = `mongodb://localhost:27017`
    return MongoClient.connect(url, { useUnifiedTopology: true }).then(
      client => {
        const db = client.db('tms_admin')
        return db
          .collection('mongodb_object')
          .deleteOne({ name: dbName })
          .then(() => client.db(dbName).dropDatabase())
          .then(() => new ResultData('ok'))
          .finally(() => {
            client.close()
          })
      }
    )
  }
}
module.exports = Db
