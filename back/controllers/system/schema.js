const _ = require('lodash')
const { ResultData, ResultFault } = require('tms-koa')
const ObjectId = require('mongodb').ObjectId
const Base = require('./base')

class Schema extends Base {
  constructor(...args) {
    super(...args)
  }
  /**
   *
   */
  async create() {
    let info = this.request.body
    info.type = 'schema'
    if (!info.scope) return new ResultData('没有指定属性定义适用对象类型')

    return this.clPreset
      .insertOne(info)
      .then((result) => new ResultData(result.ops[0]))
  }
  /**
   *
   */
  async update() {
    const { id } = this.request.query
    let info = this.request.body
    info = _.omit(info, ['_id', 'scope', 'type'])

    const query = { _id: new ObjectId(id), type: 'schema' }

    return this.clPreset
      .updateOne(query, { $set: info }, { upsert: true })
      .then(() => new ResultData(info))
  }
  /**
   *
   */
  async remove() {
    const { id } = this.request.query
    if (!id) return new ResultFault('参数不完整')

    // 是否正在使用
    let rst = await this.clPreset.findOne({
      schema_id: id,
      type: 'collection',
    })
    if (rst) return new ResultFault('扩展字段定义正在被使用不能删除')

    const query = { _id: new ObjectId(id), type: 'schema' }

    return this.clPreset.deleteOne(query).then(() => new ResultData('ok'))
  }
  /**
   * 完成信息列表
   */
  async list() {
    const { scope } = this.request.query
    if (!/db|collection|document/.test(scope))
      return new ResultData('没有指定有效的属性定义适用对象类型')

    const query = { type: 'schema', scope }

    return this.clPreset
      .find(query, { projection: { type: 0, scope: 0 } })
      .toArray()
      .then((schemas) => new ResultData(schemas))
  }
  /**
   * 简单信息列表，不包含schema定义
   */
  async listSimple() {
    const { scope } = this.request.query
    if (!/db|collection|document/.test(scope))
      return new ResultData('没有指定有效的属性定义适用对象类型')

    const query = { type: 'schema', scope }

    return this.clPreset
      .find(query, {
        projection: { _id: 1, title: 1, description: 1, scope: 1 },
      })
      .toArray()
      .then((schemas) => new ResultData(schemas))
  }
}

module.exports = Schema
