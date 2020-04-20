const { ResultData, ResultFault } = require('tms-koa')
const BucketBase = require('../bucketBase')

class Bucket extends BucketBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * 新建存储空间
   */
  async create() {
    let info = this.request.body

    const cl = this.clBucket

    // 查询是否存在同名库
    let buckets = await cl.find({ name: info.name }).toArray()
    if (buckets.length > 0) {
      return new ResultFault('已存在同名存储空间')
    }

    info.creator = this.client.id

    return cl.insertOne(info).then((result) => new ResultData(result.ops[0]))
  }
  /**
   * 更新存储空间信息
   */
  async update() {
    const bucketName = this.request.query.bucket
    let info = this.request.body
    let { _id, name, ...updatedInfo } = info
    return this.clBucket
      .updateOne({ name: bucketName }, { $set: updatedInfo })
      .then(() => new ResultData(info))
  }
  /**
   * 删除存储空间
   */
  async remove() {
    const { bucket: bucketName } = this.request.query

    return this.clBucket
      .deleteOne({ name: bucketName, creator: this.client.id })
      .then((result) => new ResultData(result.result))
  }
  /**
   * 当前用户创建的存储空间
   */
  async list() {
    const tmsBuckets = await this.clBucket
      .find({ creator: this.client.id })
      .toArray()

    return new ResultData(tmsBuckets)
  }
}

module.exports = Bucket
