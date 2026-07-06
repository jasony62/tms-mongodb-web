import { ResultData } from 'tms-koa'
import BucketBase from '@/controllers/bucketBase.js'
import ModelBucket from 'tmw-kit/dist/model/bucket.js'

class Bucket extends BucketBase {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
  /**
   * 返回当前用户的bucket列表
   */
  async list() {
    const modelBucket = new ModelBucket(
      this.mongoClient,
      this.bucketObj,
      this.client
    )
    const tmsBuckets = await modelBucket.list()
    return new ResultData(tmsBuckets)
  }
}

export default Bucket
