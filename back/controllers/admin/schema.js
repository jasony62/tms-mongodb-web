const _ = require('lodash')
const { ResultData, ResultFault } = require('tms-koa')
const ObjectId = require('mongodb').ObjectId
const SchemaBase = require('../schemaBase')

class Schema extends SchemaBase {
  constructor(...args) {
    super(...args)
  }
  /**
   *
   */
  async create() {
    let info = this.request.body
    info.type = 'schema'
    if (!info.scope)
      info.scope = 'document'

    const client = this.mongoClient
    return client
      .db('tms_admin')
      .collection('mongodb_object')
      .insertOne(info)
      .then(result => new ResultData(result.ops[0]))
  }
  /**
   *
   */
  async update() {
    const { id } = this.request.query
    let info = this.request.body
    info = _.omit(info, ['_id', 'name'])
    const client = this.mongoClient
    return client
      .db('tms_admin')
      .collection('mongodb_object')
      .updateOne(
        { _id: new ObjectId(id), type: 'schema' },
        { $set: info },
        { upsert: true }
      )
      .then(() => new ResultData(info))
  }
  /**
   *
   */
  async remove() {
    const { id } = this.request.query
    if (!id) return new ResultFault("参数不完整")

    const client = this.mongoClient
    const cl = client.db('tms_admin').collection('mongodb_object')
    
    // 是否正在使用
    let rst = await cl.findOne({schema_id: id, type: "collection"})
    if (rst) {
      return new ResultFault("集合列正在被使用不能删除")
    }

    return cl
      .deleteOne({ _id: new ObjectId(id), type: 'schema' })
      .then(() => new ResultData('ok'))
  }
}

module.exports = Schema
