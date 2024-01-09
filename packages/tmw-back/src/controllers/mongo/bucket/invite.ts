import { Ctrl, ResultData, ResultFault } from 'tms-koa'
import mongodb from 'mongodb'
const ObjectId = mongodb.ObjectId

/**
 * 保存元数据的数据库
 */
const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'

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

    const clLog = this['mongoClient']
      .db(META_ADMIN_DB)
      .collection('bucket_invite_log')

    const { code, nickname } = this['request'].body
    if (!code || !nickname) return new ResultFault('没有提供又有效参数')

    const invite = await clLog.findOne({
      bucket,
      code,
      nickname,
      expireAt: { $gt: new Date() },
    })

    if (!invite)
      return new ResultFault(
        '没有匹配的邀请，请确认邀请码、昵称是否正确，要求是否已过期'
      )

    if (invite.acceptAt)
      return new ResultFault('邀请码已经使用，不允许重复使用')

    const invitee = this['client'].id // 被邀请人

    /*加入bucket授权列表*/
    const clBucket = this['mongoClient'].db(META_ADMIN_DB).collection('bucket')
    const coworkerQuery = {
      name: bucket,
      'coworkers.id': invitee,
    }
    const coworkerBucket = await clBucket.findOne(coworkerQuery)
    if (coworkerBucket) {
      await clBucket.updateOne(coworkerQuery, {
        $set: { 'coworkers.$.nickname': nickname },
      })
    } else {
      await clBucket.updateOne(
        { name: bucket },
        {
          $push: { coworkers: { id: invitee, nickname } },
        }
      )
    }

    return clLog
      .updateOne(
        { _id: new ObjectId(invite._id) },
        { $set: { invitee, acceptAt: new Date(Date.now() + 3600 * 8 * 1000) } }
      )
      .then(() => new ResultData('ok'))
  }
}

export default Invite
