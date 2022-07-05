import { ResultData } from 'tms-koa'
import BucketBase from '@/controllers/bucketBase'

class Bucket extends BucketBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * 返回当前用户的bucket列表
   */
  async list() {
    const tmsBuckets = await this["clBucket"]
      .find({
        $or: [{ creator: this["client"].id }, { 'coworkers.id': this["client"].id }],
      })
      .toArray()

    return new ResultData(tmsBuckets)
  }
}

export default Bucket
