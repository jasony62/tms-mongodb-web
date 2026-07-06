import mongodb from 'mongodb'
import { IBucketInviteRepository, InviteDTO } from '../interfaces.js'

const ObjectId = mongodb.ObjectId

const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'

export class MongoBucketInviteRepository implements IBucketInviteRepository {
  private mongoClient: mongodb.MongoClient

  constructor(mongoClient: mongodb.MongoClient) {
    this.mongoClient = mongoClient
  }

  private get clLog(): any {
    return this.mongoClient.db(META_ADMIN_DB).collection('bucket_invite_log')
  }

  async findPending(
    bucket: string,
    nickname: string
  ): Promise<InviteDTO | null> {
    return this.clLog.findOne({
      bucket,
      nickname,
      acceptAt: { $exists: false },
    })
  }

  async findValid(
    bucket: string,
    code: string,
    nickname: string,
    now: Date
  ): Promise<InviteDTO | null> {
    return this.clLog.findOne({
      bucket,
      code,
      nickname,
      expireAt: { $gt: now },
      acceptAt: { $exists: false },
    })
  }

  async findByBucketAndCode(
    bucket: string,
    code: string
  ): Promise<InviteDTO | null> {
    return this.clLog.findOne({ bucket, code })
  }

  async create(invite: Partial<InviteDTO>): Promise<InviteDTO> {
    const result = await this.clLog.insertOne(invite)
    return { _id: result.insertedId, ...invite } as InviteDTO
  }

  async accept(
    inviteId: string,
    invitee: string,
    acceptAt: string
  ): Promise<boolean> {
    return this.clLog
      .updateOne(
        { _id: new ObjectId(inviteId) },
        { $set: { invitee, acceptAt } }
      )
      .then((r) => r.modifiedCount > 0)
      .catch(() => false)
  }

  async updateExpiry(id: string, expireAt: Date): Promise<boolean> {
    return this.clLog
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: { expireAt } }
      )
      .then((r) => r.modifiedCount > 0)
      .catch(() => false)
  }
}
