const _ = require('lodash')
const { Ctrl, ResultData, ResultFault } = require('tms-koa')
const MongoClient = require('mongodb').MongoClient

class Collection extends Ctrl {
  /**
   *
   */
  list() {
    let { db: dbName } = this.request.query
    const url = `mongodb://localhost:27017/${dbName}`
    return MongoClient.connect(url, { useUnifiedTopology: true }).then(
      client => {
        const p1 = client
          .db()
          .listCollections({}, { nameOnly: true })
          .toArray()
          .then(collections => collections.map(c => c.name))
        const clMongoObj = client.db('tms_admin').collection('mongodb_object')
        const p2 = clMongoObj
          .find({ type: 'collection', database: dbName })
          .toArray()
        return Promise.all([p1, p2])
          .then(values => {
            const [rawClNames, tmsCls] = values
            const tmsClNames = tmsCls.map(c => c.name)
            const diff = _.difference(rawClNames, tmsClNames)
            diff.forEach(name => tmsCls.push({ name }))
            return new ResultData(tmsCls)
          })
          .finally(() => client.close())
      }
    )
  }
  /**
   * 新建集合
   */
  create() {
    let { db: dbName } = this.request.query
    const info = this.request.body
    info.type = 'collection'
    info.database = dbName
    const url = `mongodb://localhost:27017/${dbName}`
    return MongoClient.connect(url, { useUnifiedTopology: true }).then(client =>
      client
        .db()
        .createCollection(info.name)
        .then(() => client.db('tms_admin').collection('mongodb_object'))
        .then(cl => cl.insertOne(info))
        .then(result => new ResultData(result.ops[0]))
        .finally(() => client.close())
    )
  }
  /**
   * 更新集合对象信息
   */
  update() {
    let { db: dbName, cl: clName } = this.request.query
    let info = this.request.body
    info = _.omit(info, ['_id', 'name', 'database'])
    const url = `mongodb://localhost:27017/tms_admin`
    return MongoClient.connect(url, { useUnifiedTopology: true }).then(
      client => {
        const cl = client.db().collection('mongodb_object')
        return cl
          .updateOne(
            { database: dbName, name: clName, type: 'collection' },
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
   * 删除集合
   */
  remove() {
    let { db: dbName, cl: clName } = this.request.query
    const url = `mongodb://localhost:27017/${dbName}`
    return MongoClient.connect(url, { useUnifiedTopology: true })
      .then(client => {
        const db = client.db()
        return db
          .dropCollection(clName)
          .then(() => new ResultData('ok'))
          .finally(() => client.close())
      })
      .catch(err => Promise.reject(new ResultFault(err.message)))
  }
  rename() {
    let { db: dbName, cl: clName, newName } = this.request.query
    const url = `mongodb://localhost:27017/${dbName}`
    return MongoClient.connect(url, { useUnifiedTopology: true })
      .then(client => {
        const db = client.db()
        return db
          .renameCollection(clName, newName)
          .then(() => new ResultData('ok'))
          .finally(() => client.close())
      })
      .catch(err => Promise.reject(new ResultFault(err.message)))
  }
}
module.exports = Collection
