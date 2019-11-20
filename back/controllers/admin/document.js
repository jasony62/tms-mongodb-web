const { Ctrl, ResultData } = require('tms-koa')

class Document extends Ctrl {
  list() {
    const { db: dbName, cl: clName } = this.request.query
    const MongoClient = require('mongodb').MongoClient
    const url = `mongodb://localhost:27017/${dbName}`
    return MongoClient.connect(url, { useUnifiedTopology: true }).then(
      client =>
        new Promise((resolve, reject) => {
          const db = client.db()
          db.collection(clName, { strict: true }, (err, collection) => {
            if (err) {
              client.close()
              reject(err)
            }
            collection
              .find()
              .toArray()
              .then(docs => resolve(new ResultData(docs)))
              .finally(() => client.close())
          })
        })
    )
  }
  create() {
    const { db: dbName, cl: clName } = this.request.query
    const doc = this.request.body
    const MongoClient = require('mongodb').MongoClient
    const url = `mongodb://localhost:27017/${dbName}`
    return MongoClient.connect(url, { useUnifiedTopology: true }).then(
      client =>
        new Promise((resolve, reject) => {
          const db = client.db()
          db.collection(clName, { strict: true }, (err, collection) => {
            if (err) {
              client.close()
              reject(err)
            }
            collection
              .insertOne(doc)
              .then(() => resolve(new ResultData(doc)))
              .finally(() => client.close())
          })
        })
    )
  }
  update() {
    const { db: dbName, cl: clName, id } = this.request.query
    const doc = this.request.body
    const MongoClient = require('mongodb').MongoClient
    const url = `mongodb://localhost:27017/${dbName}`
    return MongoClient.connect(url, { useUnifiedTopology: true }).then(
      client =>
        new Promise((resolve, reject) => {
          const db = client.db()
          db.collection(clName, { strict: true }, (err, collection) => {
            if (err) {
              client.close()
              reject(err)
            }
            const ObjectId = require('mongodb').ObjectId
            collection
              .updateOne({ _id: ObjectId(id) }, { $set: doc })
              .then(() => resolve(new ResultData(doc)))
              .finally(() => client.close())
          })
        })
    )
  }
  remove() {
    const { db: dbName, cl: clName, id } = this.request.query
    const MongoClient = require('mongodb').MongoClient
    const url = `mongodb://localhost:27017/${dbName}`
    return MongoClient.connect(url, { useUnifiedTopology: true }).then(
      client =>
        new Promise((resolve, reject) => {
          const db = client.db()
          db.collection(clName, { strict: true }, (err, collection) => {
            if (err) {
              client.close()
              reject(err)
            }
            const ObjectId = require('mongodb').ObjectId
            collection
              .deleteOne({ _id: ObjectId(id) })
              .then(result => resolve(new ResultData(result.result)))
              .finally(() => client.close())
          })
        })
    )
  }
  bulk() {
    return new ResultData('指定数据库下批量新建文档')
  }
}
module.exports = Document
