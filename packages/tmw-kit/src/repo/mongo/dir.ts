import mongodb from 'mongodb'
import { IDirRepository } from '../interfaces.js'

const ObjectId = mongodb.ObjectId

const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'

export class MongoDirRepository implements IDirRepository {
  private mongoClient: mongodb.MongoClient

  constructor(mongoClient: mongodb.MongoClient) {
    this.mongoClient = mongoClient
  }

  private get clDir(): any {
    return this.mongoClient.db(META_ADMIN_DB).collection('mongodb_object_dir')
  }

  async create(
    db: { sysname: string; name: string },
    info: { name: string; title?: string; description?: string; order?: number },
    parentFullName?: string,
    scope = 'collection',
    bucket?: string
  ): Promise<[boolean, any]> {
    const newDir: any = {
      name: info.name,
      title: info.title,
      scope,
      description: info.description,
      order: info.order ?? 99,
      db: { sysname: db.sysname, name: db.name },
    }
    if (bucket) newDir.bucket = bucket

    newDir.full_name = parentFullName ? `${parentFullName}/${info.name}` : info.name
    newDir.level = newDir.full_name.split('/').length

    return this.clDir
      .insertOne(newDir)
      .then((result) => [true, result])
      .catch((err) => [false, err.message])
  }

  async update(
    id: string,
    info: { title?: string; description?: string; order?: number }
  ): Promise<[boolean, any]> {
    const { title, description, order = 99 } = info
    const newDir: any = { title, description, order }
    return this.clDir
      .updateOne({ _id: new ObjectId(id) }, { $set: newDir })
      .then((result) => [true, result])
      .catch((err) => [false, err.message])
  }

  async delete(id: string): Promise<[boolean, string | null]> {
    return this.clDir
      .deleteOne({ _id: new ObjectId(id) })
      .then(() => [true])
      .catch((err) => [false, err.message])
  }

  async findById(id: string, db?: { sysname: string }): Promise<any> {
    const query: any = { _id: new ObjectId(id) }
    if (db) query['db.sysname'] = db.sysname
    return this.clDir.findOne(query)
  }

  async findByFullName(
    db: { sysname: string } | string,
    fullName: string,
    scope = 'collection',
    bucket?: string
  ): Promise<any> {
    const query: any = { full_name: fullName, scope }
    if (typeof db === 'object') query['db.sysname'] = db.sysname
    else if (typeof db === 'string') query['db.name'] = db
    if (bucket) query.bucket = bucket
    return this.clDir.findOne(query)
  }

  async listChildren(
    db: { sysname: string } | string,
    fullName: string,
    scope = 'collection',
    bucket?: string
  ): Promise<any[]> {
    const query: any = {
      full_name: { $regex: new RegExp('^' + fullName + '/') },
      scope,
    }
    if (typeof db === 'object') query['db.sysname'] = db.sysname
    else if (typeof db === 'string') query['db.name'] = db
    if (bucket) query.bucket = bucket
    return this.clDir.find(query).toArray()
  }

  async list(db: { name: string }, scope = 'collection'): Promise<[boolean, any[]]> {
    const dirs = await this.clDir
      .find({ 'db.name': db.name, scope }, { projection: { db: 0 } })
      .sort({ level: 1, order: 1 })
      .toArray()
    return [true, dirs]
  }
}
