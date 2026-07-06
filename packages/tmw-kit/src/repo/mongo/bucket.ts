import mongodb from 'mongodb'
import { IBucketRepository, BucketDTO } from '../interfaces.js'

const ObjectId = mongodb.ObjectId

const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'

export class MongoBucketRepository implements IBucketRepository {
  private mongoClient: mongodb.MongoClient

  constructor(mongoClient: mongodb.MongoClient) {
    this.mongoClient = mongoClient
  }

  private get clBucket(): any {
    return this.mongoClient.db(META_ADMIN_DB).collection('bucket')
  }

  async findByName(name: string): Promise<BucketDTO | null> {
    return this.clBucket.findOne({ name })
  }

  async findById(id: string): Promise<BucketDTO | null> {
    return this.clBucket.findOne({ _id: new ObjectId(id) })
  }

  async findByCreatorOrCoworker(userId: string): Promise<BucketDTO[]> {
    return this.clBucket
      .find({
        $or: [
          { creator: userId },
          { 'coworkers.id': userId },
        ],
      })
      .toArray()
  }

  async create(info: Partial<BucketDTO>): Promise<BucketDTO> {
    const result = await this.clBucket.insertOne(info)
    return { _id: result.insertedId, ...info } as BucketDTO
  }

  async update(name: string, info: Partial<BucketDTO>): Promise<boolean> {
    return this.clBucket
      .updateOne({ name }, { $set: info })
      .then((r) => r.modifiedCount > 0)
      .catch(() => false)
  }

  async delete(name: string, creatorId: string): Promise<boolean> {
    return this.clBucket
      .deleteOne({ name, creator: creatorId })
      .then((r) => r.deletedCount > 0)
      .catch(() => false)
  }

  async addCoworker(
    name: string,
    coworker: { id: string; nickname: string; accept_time?: string }
  ): Promise<boolean> {
    return this.clBucket
      .updateOne({ name }, { $push: { coworkers: coworker } })
      .then((r) => r.modifiedCount > 0)
      .catch(() => false)
  }

  async updateCoworker(
    name: string,
    userId: string,
    data: { nickname?: string; change_time?: string }
  ): Promise<boolean> {
    return this.clBucket
      .updateOne(
        { name, 'coworkers.id': userId },
        { $set: Object.entries(data).reduce((acc, [k, v]) => {
          acc[`coworkers.$.${k}`] = v
          return acc
        }, {} as any) }
      )
      .then((r) => r.modifiedCount > 0)
      .catch(() => false)
  }

  async removeCoworker(name: string, userId: string): Promise<boolean> {
    return this.clBucket
      .updateOne(
        { name },
        { $pull: { coworkers: { id: { $in: [userId, parseInt(userId)] } } } }
      )
      .then((r) => r.modifiedCount > 0)
      .catch(() => false)
  }
}
