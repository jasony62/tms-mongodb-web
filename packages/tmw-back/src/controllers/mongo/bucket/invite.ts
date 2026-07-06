import { Ctrl, ResultData, ResultFault } from 'tms-koa'
import ModelBucket from 'tmw-kit/dist/model/bucket.js'

class Invite extends Ctrl {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
  /**
   * 接受邀请
   */
  async accept() {
    const { bucket } = this['request'].query
    if (!bucket) return new ResultFault('没有指定邀请的空间')

    const { code, nickname } = this['request'].body
    if (!code || !nickname) return new ResultFault('没有提供又有效参数')

    const modelBucket = new ModelBucket(
      this.mongoClient,
      this.bucketObj,
      this.client
    )
    const [ok, result] = await modelBucket.acceptInvite(
      bucket,
      code,
      nickname,
      this.client.id
    )
    return ok ? new ResultData(result) : new ResultFault(result)
  }
}

export default Invite
