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
    if (!info.scope) info.scope = 'document'
    if (this.bucket) info.bucket = this.bucket.name

    return this.clMongoObj
      .insertOne(info)
      .then((result) => new ResultData(result.ops[0]))
  }
  /**
   *
   */
  async update() {
    const { id } = this.request.query
    let info = this.request.body
    const { scope } = info
    info = _.omit(info, ['_id', 'name', 'scope', 'bucket'])

    const query = { _id: new ObjectId(id), type: 'schema' }
    if (this.bucket) query.bucket = this.bucket.name

    return this.clMongoObj
      .updateOne(query, { $set: info }, { upsert: true })
      .then(() => {
        info.scope = scope
        return new ResultData(info)
      })
  }
  /**
   *
   */
  async remove() {
    const { id } = this.request.query
    if (!id) return new ResultFault('参数不完整')

    // 是否正在使用
    let rst = await this.clMongoObj.findOne({
      schema_id: id,
      type: 'collection',
    })
    if (rst) {
      return new ResultFault('属性定义正在被使用不能删除')
    }
    const query = { _id: new ObjectId(id), type: 'schema' }
    if (this.bucket) query.bucket = this.bucket.name
    return this.clMongoObj.deleteOne(query).then(() => new ResultData('ok'))
  }
}

module.exports = Schema
