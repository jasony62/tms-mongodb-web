import mongodb from 'mongodb'
import { IDbRepository } from '../interfaces.js'
import type { DbDTO } from '../interfaces.js'

const ObjectId = mongodb.ObjectId

const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'

export class MongoDbRepository implements IDbRepository {
  private mongoClient: mongodb.MongoClient

  constructor(mongoClient: mongodb.MongoClient) {
    this.mongoClient = mongoClient
  }

  private get clMongoObj(): any {
    return this.mongoClient.db(META_ADMIN_DB).collection('mongodb_object')
  }

  async findByName(name: string, bucket?: string): Promise<DbDTO | null> {
    const query: any = { name, type: 'database' }
    if (bucket) query.bucket = bucket
    return this.clMongoObj.findOne(query)
  }

  async findBySysname(sysname: string, bucket?: string): Promise<DbDTO | null> {
    const query: any = { sysname, type: 'database' }
    if (bucket) query.bucket = bucket
    return this.clMongoObj.findOne(query)
  }

  async create(info: Partial<DbDTO>): Promise<DbDTO> {
    const doc: any = { ...info, type: 'database' }
    const result = await this.clMongoObj.insertOne(doc)
    doc._id = result.insertedId
    return doc as DbDTO
  }

  async update(id: string, info: Partial<DbDTO>): Promise<boolean> {
    const query = { _id: new ObjectId(id), type: 'database' }
    const result = await this.clMongoObj.updateOne(query, { $set: info })
    return result.modifiedCount === 1
  }

  async delete(sysname: string): Promise<boolean> {
    const query = { sysname, type: 'database' }
    const result = await this.clMongoObj.deleteOne(query)
    return result.deletedCount === 1
  }

  async list(
    keyword?: string,
    skip?: number,
    limit?: number,
    bucket?: string
  ): Promise<{ databases: DbDTO[]; total: number } | DbDTO[]> {
    const query: any = { type: 'database' }

    if (bucket) query.bucket = bucket

    if (keyword) {
      let re = new RegExp(keyword.replace(/\(/g, '\\(').replace(/\)/g, '\\)'))
      query.$or = [
        { name: { $regex: re, $options: 'i' } },
        { title: { $regex: re, $options: 'i' } },
        { description: { $regex: re, $options: 'i' } },
        { tag: { $regex: re, $options: 'i' } },
      ]
    }

    const options: any = {
      projection: { type: 0 },
      sort: { top: -1, _id: -1 },
    }

    if (typeof skip === 'number') {
      options.skip = skip
      options.limit = limit
    }

    const tmwDbs = await this.clMongoObj.find(query, options).toArray()

    if (typeof skip === 'number') {
      const total = await this.clMongoObj.countDocuments(query)
      return { databases: tmwDbs, total }
    }

    return tmwDbs
  }
}
