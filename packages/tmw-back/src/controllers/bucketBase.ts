import { Ctrl, ResultFault } from 'tms-koa'

/**
 * 保存元数据的数据库
 */
const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'
/**
 * 保存元数据的集合
 */
const META_ADMIN_CL_BUCKET = 'bucket'

class BucketBase extends Ctrl {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
  async tmsBeforeEach(): Promise<true | ResultFault> {
    const client = this.mongoClient
    const cl = client.db(META_ADMIN_DB).collection(META_ADMIN_CL_BUCKET)
    this['clBucket'] = cl
    return true
  }
}

export default BucketBase
