import { ResultData } from 'tms-koa'
import BucketBase from '@/controllers/bucketBase.js'

class Bucket extends BucketBase {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
  /**
   * 返回当前用户的bucket列表
   */
  async list() {
    const tmsBuckets = await this['clBucket']
      .find({
        $or: [
          { creator: this['client'].id },
          { 'coworkers.id': this['client'].id },
        ],
      })
      .toArray()

    return new ResultData(tmsBuckets)
  }
}

export default Bucket
