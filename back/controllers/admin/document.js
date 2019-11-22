const { Ctrl, ResultData } = require('tms-koa')
const { Context } = require('../../context')
const ObjectId = require('mongodb').ObjectId

class Document extends Ctrl {
  /**
   *
   */
  async list() {
    const { db: dbName, cl: clName } = this.request.query
    const client = await Context.mongoClient()
    return client
      .db(dbName)
      .collection(clName)
      .find()
      .toArray()
      .then(docs => new ResultData(docs))
  }
  /**
   *
   */
  async create() {
    const { db: dbName, cl: clName } = this.request.query
    const doc = this.request.body
    const client = await Context.mongoClient()
    return client
      .db(dbName)
      .collection(clName)
      .insertOne(doc)
      .then(() => new ResultData(doc))
  }
  /**
   *
   */
  async update() {
    const { db: dbName, cl: clName, id } = this.request.query
    const doc = this.request.body
    const client = await Context.mongoClient()
    return client
      .db(dbName)
      .collection(clName)
      .updateOne({ _id: ObjectId(id) }, { $set: doc })
      .then(() => new ResultData(doc))
  }
  /**
   *
   */
  async remove() {
    const { db: dbName, cl: clName, id } = this.request.query
    const client = await Context.mongoClient()
    return client
      .db(dbName)
      .collection(clName)
      .deleteOne({ _id: ObjectId(id) })
      .then(result => new ResultData(result.result))
  }
  bulk() {
    return new ResultData('指定数据库下批量新建文档')
  }
}
module.exports = Document
