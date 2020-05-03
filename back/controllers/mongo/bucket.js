const { ResultData } = require('tms-koa')
const BucketBase = require('../bucketBase')

class Bucket extends BucketBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * 返回当前用户的bucket列表
   */
  async list() {
    const tmsBuckets = await this.clBucket
      .find({ creator: this.client.id })
      .toArray()

    return new ResultData(tmsBuckets)
  }
}

module.exports = Bucket
