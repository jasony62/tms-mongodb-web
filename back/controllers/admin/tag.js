const _ = require('lodash')
const { ResultData, ResultFault } = require('tms-koa')
const ObjectId = require('mongodb').ObjectId
const TagBase = require('../tagBase')

class Tag extends TagBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * 创建标签
   */
  async create() {
    let info = this.request.body
    info.type = 'tag'
    if (this.bucket) info.bucket = this.bucket.name

    // 查询是否存在同名标签
    let existTag = await this.tagHelper.tagByName(info.name)
    if (existTag) return new ResultFault('已存在同名标签')

    return this.clMongoObj
      .insertOne(info)
      .then(result => new ResultData(result.ops[0]))
  }
	/**
   * 更改标签
   */
  async update() {
    const { id } = this.request.query
    let info = this.request.body

    // 查询是否存在同名标签
    let existTag = await this.tagHelper.tagByName(info.name)
    if (existTag) return new ResultFault('已存在同名标签')

    let query = { _id: new ObjectId(id), type: 'tag' }
    if (this.bucket) query.bucket = this.bucket.name

    info = _.omit(info, ['_id', 'type', 'bucket'])

    return this.clMongoObj
      .updateOne(query, { $set: info }, { upsert: true })
      .then(() => {
        return new ResultData(info)
      })
  }
  /**
   *
   */
  async remove() {
    const { name } = this.request.query
    if (!name) return new ResultFault('参数不完整')

    // 是否正在使用
    let rst = await this.clMongoObj.findOne({
      'tags': { $elemMatch: { $eq: name } },
      'type': 'schema',
    })

    if (rst) {
      return new ResultFault('标签正在被使用不能删除')
    }
    const query = { 'name': name, 'type': 'tag' }
    if (this.bucket) query.bucket = this.bucket.name
    return this.clMongoObj.deleteOne(query).then(() => new ResultData('ok'))
  }
}

module.exports = Tag
