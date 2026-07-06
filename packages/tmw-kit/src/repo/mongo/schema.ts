import mongodb from 'mongodb'
import { ISchemaRepository } from '../interfaces.js'
import type { SchemaDTO } from '../interfaces.js'

const ObjectId = mongodb.ObjectId

const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'

export class MongoSchemaRepository implements ISchemaRepository {
  private mongoClient: mongodb.MongoClient

  constructor(mongoClient: mongodb.MongoClient) {
    this.mongoClient = mongoClient
  }

  private get clMongoObj(): any {
    return this.mongoClient.db(META_ADMIN_DB).collection('mongodb_object')
  }

  async findById(id: string, bucket?: string, dbName?: string): Promise<SchemaDTO | null> {
    const query: any = { _id: new ObjectId(id), type: 'schema' }
    if (bucket) query.bucket = bucket
    if (dbName) query['db.name'] = dbName
    return this.clMongoObj.findOne(query)
  }

  async findByIds(ids: any[], options?: { projection?: any }): Promise<SchemaDTO[]> {
    const query = { type: 'schema', _id: { $in: ids } }
    return this.clMongoObj.find(query, options).toArray()
  }

  async findByName(
    name: string,
    options?: { onlyProperties?: boolean; dbName?: string | null; scope?: string; bucket?: string }
  ): Promise<any> {
    const { dbName = null, scope = 'document', bucket } = options || {}
    let query: any
    if (dbName) {
      query = {
        $and: [
          { type: 'schema', name, scope },
          { $or: [{ 'db.name': dbName }, { db: null }] },
        ],
      }
      if (bucket) query['$and'].push({ bucket })
    } else {
      query = { type: 'schema', name, scope, db: null }
      if (bucket) query.bucket = bucket
    }
    return this.clMongoObj.findOne(query)
  }

  async listSimple(dbName: string, scope = 'document', bucket?: string): Promise<SchemaDTO[]> {
    let query: any
    if (dbName) {
      query = {
        $and: [
          { type: 'schema', scope: { $in: scope.split(',') } },
          { $or: [{ 'db.name': dbName }, { db: null }] },
        ],
      }
      if (bucket) query['$and'].push({ bucket })
    } else {
      query = { type: 'schema', scope: { $in: scope.split(',') } }
      if (bucket) query.bucket = bucket
    }
    return this.clMongoObj
      .find(query, {
        projection: { _id: 1, title: 1, description: 1, scope: 1, db: 1 },
      })
      .sort('order', 1)
      .toArray()
  }

  async deleteById(id: string, bucket?: string): Promise<boolean> {
    const query: any = { _id: new ObjectId(id), type: 'schema' }
    if (bucket) query.bucket = bucket
    const result = await this.clMongoObj.deleteOne(query)
    return result.deletedCount === 1
  }
}
