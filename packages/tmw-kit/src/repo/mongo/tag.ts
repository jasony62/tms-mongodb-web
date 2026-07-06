import mongodb from 'mongodb'
import { ITagRepository } from '../interfaces.js'

const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'
const TAG_CL = 'tag_object'

export class MongoTagRepository implements ITagRepository {
  private mongoClient: mongodb.MongoClient
  private bucket: any

  constructor(mongoClient: mongodb.MongoClient, bucket?: any) {
    this.mongoClient = mongoClient
    this.bucket = bucket
  }

  private get clTagObj(): any {
    return this.mongoClient.db(META_ADMIN_DB).collection(TAG_CL)
  }

  async create(info: { name: string; bucket?: string }): Promise<any> {
    const doc: any = { name: info.name, type: 'tag' }
    if (info.bucket) doc.bucket = info.bucket
    const result = await this.clTagObj.insertOne(doc)
    doc._id = result.insertedId
    return doc
  }

  async update(
    id: string,
    bucketName: string | undefined,
    info: any
  ): Promise<any> {
    const ObjectId = mongodb.ObjectId
    const query: any = { _id: new ObjectId(id), type: 'tag' }
    if (bucketName) query.bucket = bucketName
    const update = { $set: info }
    return this.clTagObj.updateOne(query, update, { upsert: true })
  }

  async remove(name: string, bucketName?: string): Promise<any> {
    const query: any = { name }
    if (bucketName) query.bucket = bucketName
    return this.clTagObj.deleteOne(query)
  }

  async findByName(name: string, bucketName?: string): Promise<any> {
    const query: any = { name }
    if (bucketName) query.bucket = bucketName
    return this.clTagObj.findOne(query)
  }

  async list(bucketName?: string): Promise<any[]> {
    const query: any = {}
    if (bucketName) query.bucket = bucketName
    return this.clTagObj.find(query).toArray()
  }

  async checkInUse(name: string): Promise<boolean> {
    const doc = await this.mongoClient
      .db(META_ADMIN_DB)
      .collection('mongodb_object')
      .findOne({
        tags: { $elemMatch: { $eq: name } },
        type: 'schema',
      })
    return !!doc
  }
}
