import { Ctrl, ResultFault } from 'tms-koa'

class BucketBase extends Ctrl {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
  async tmsBeforeEach(): Promise<true | ResultFault> {
    const client = this['mongoClient']
    const cl = client.db('tms_admin').collection('bucket')
    this['clBucket'] = cl
    return true
  }
}

export default BucketBase
