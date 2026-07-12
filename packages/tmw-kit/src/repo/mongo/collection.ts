import mongodb from 'mongodb'
import { ICollectionRepository } from '../interfaces.js'

const ObjectId = mongodb.ObjectId

const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'

export class MongoCollectionRepository implements ICollectionRepository {
  private mongoClient: mongodb.MongoClient

  constructor(mongoClient: mongodb.MongoClient) {
    this.mongoClient = mongoClient
  }

  private get clMongoObj(): any {
    if (!this.mongoClient) {
      throw new Error(
        'MongoDB 客户端未初始化，请检查 mongodb 连接配置是否正确（host/port/user/password）以及数据库服务是否已启动。'
      )
    }
    return this.mongoClient.db(META_ADMIN_DB).collection('mongodb_object')
  }

  async findById(
    tmwDb: { sysname: string } | string,
    id: string,
    bucket?: string
  ): Promise<any> {
    const query: any = { _id: new ObjectId(id), type: 'collection' }
    if (typeof tmwDb === 'object') query['db.sysname'] = tmwDb.sysname
    else if (typeof tmwDb === 'string') query['db.name'] = tmwDb
    if (bucket) query.bucket = bucket
    return this.clMongoObj.findOne(query)
  }

  async findByName(
    tmwDb: { sysname: string } | string,
    name: string,
    bucket?: string
  ): Promise<any> {
    const query: any = { name, type: 'collection' }
    if (typeof tmwDb === 'object') query['db.sysname'] = tmwDb.sysname
    else if (typeof tmwDb === 'string') query['db.name'] = tmwDb
    if (bucket) query.bucket = bucket
    return this.clMongoObj.findOne(query)
  }

  async findBySysname(
    db: { sysname: string },
    sysname: string,
    bucket?: string
  ): Promise<any> {
    const query: any = {
      'db.sysname': db.sysname,
      sysname,
      type: 'collection',
    }
    if (bucket) query.bucket = bucket
    return this.clMongoObj.findOne(query)
  }

  async create(collection: any): Promise<any> {
    return this.clMongoObj.insertOne(collection).then((r) => r)
  }

  async update(id: string, info: any): Promise<[boolean, any]> {
    const { _id, sysname, database, db, type, bucket, ...updatedInfo } = info
    const cleaned: any = { children: '' }
    return this.clMongoObj
      .updateOne({ _id: new ObjectId(id) }, { $set: updatedInfo, $unset: cleaned })
      .then((rst) => [true, rst])
      .catch((err) => [false, err.message])
  }

  async delete(id: string): Promise<boolean> {
    return this.clMongoObj
      .deleteOne({ _id: new ObjectId(id) })
      .then(() => true)
      .catch(() => false)
  }

  async list(
    dbSysname: string,
    dirFullName?: string,
    keyword?: string,
    skip?: number,
    limit?: number,
    bucket?: string
  ): Promise<{ collections: any[]; total: number } | any[]> {
    const query: any = {
      type: 'collection',
      'db.sysname': dbSysname,
    }
    if (bucket) query.bucket = bucket
    if (dirFullName) {
      query.dir_full_name = {
        $regex: new RegExp('^' + dirFullName + '(?=/|$)'),
      }
    }
    if (keyword) {
      let re = new RegExp(keyword)
      query.$or = [
        { name: { $regex: re, $options: 'i' } },
        { title: { $regex: re, $options: 'i' } },
        { description: { $regex: re, $options: 'i' } },
      ]
    }
    const options: any = { projection: { type: 0 } }
    if (typeof skip === 'number') {
      options.skip = skip
      options.limit = limit
    }
    const items = await this.clMongoObj.find(query, options).sort({ _id: -1 }).toArray()
    if (typeof skip === 'number') {
      const total = await this.clMongoObj.countDocuments(query)
      return { collections: items, total }
    }
    return items
  }

  async processCl(collections: any[], mongoClient: any, bucket?: any): Promise<any[]> {
    const schemaIds = collections.reduce((ids, cl) => {
      if (cl.schema_id && typeof cl.schema_id === 'string')
        ids.push(new ObjectId(cl.schema_id))
      return ids
    }, [])
    if (schemaIds.length === 0) return collections
    const schemas = await this.clMongoObj
      .find({
        type: 'schema',
        _id: { $in: schemaIds },
      })
      .project({ name: 1, parentName: 1, order: 1 })
      .toArray()
    const idToSchema: any = schemas.reduce((m, s) => {
      m[s._id.toString()] = s
      return m
    }, {})
    return collections.map((cl) => {
      if (!cl.schema_id || typeof cl.schema_id !== 'string') return cl
      const schema = idToSchema[cl.schema_id]
      if (!schema) return cl
      cl.schema_name = schema.name
      cl.schema_parentName = schema.parentName
      cl.schema_order = schema.order
      return cl
    })
  }
}
