const _ = require('lodash')
const { Ctrl, ResultData } = require('tms-koa')
const { Context } = require('../../context')
const ObjectId = require('mongodb').ObjectId

class Schema extends Ctrl {
  /**
   * 完成信息列表
   */
  async list() {
    const client = await Context.mongoClient()
    return client
      .db('tms_admin')
      .collection('mongodb_object')
      .find({ type: 'schema' })
      .toArray()
      .then(schemas => new ResultData(schemas))
  }
  /**
   * 简单信息列表
   */
  async listSimple() {
    const client = await Context.mongoClient()
    return client
      .db('tms_admin')
      .collection('mongodb_object')
      .find(
        { type: 'schema' },
        { projection: { _id: 1, title: 1, description: 1 } }
      )
      .toArray()
      .then(schemas => new ResultData(schemas))
  }
}
module.exports = Schema
