import mongodb from 'mongodb'
import Base from './base.js'
import ModelDb from './db.js'

const ObjectId = mongodb.ObjectId

class Schema extends Base {
  get _modelDb() {
    const model = new ModelDb(this.mongoClient, this.bucket, this.client)
    return model
  }
  /**
   * 根据ID获得字段定义
   */
  async bySchemaId(id, { onlyProperties = true } = {}) {
    let query = {
      _id: new ObjectId(id),
      type: 'schema',
    }
    const schema = await this.clMongoObj.findOne(query)
    if (!schema) return false

    //检查访问db的权限
    if (schema.db?.name) {
      const db = await this._modelDb.byName(schema.db.name)
      if (!db) throw Error('数据错误，文档定义所属数据库不存在')
      // 如果没有通过，会抛出异常
      await this._modelDb.checkAcl(db)
    }

    if (onlyProperties === true) return schema.body.properties

    return schema
  }
  /**
   * 根据ID获得字段定义
   *
   * @param ids ObjectId数组
   * @param options
   * @returns
   */
  async bySchemaIds(ids: [], options = {}) {
    const query = {
      type: 'schema',
      _id: { $in: ids },
    }
    const schemas = await this.clMongoObj.find(query, options).toArray()
    return schemas
  }
  /**
   * 根据名称获得字段定义
   * @param {string} name
   */
  async byName(
    name: string,
    { onlyProperties = true, dbName = null, scope = 'document' } = {}
  ) {
    let query: any // 查询条件
    if (dbName) {
      query = {
        $and: [
          { type: 'schema', name, scope },
          {
            $or: [{ 'db.name': dbName }, { db: null }],
          },
        ],
      }
      if (this.bucket) query['$and'].push({ bucket: this.bucket.name })
    } else {
      query = { type: 'schema', name, scope, db: null }
      if (this.bucket) query.bucket = this.bucket.name
    }

    const schema = await this.clMongoObj.findOne(query)
    if (!schema) return false

    //@TODO 应该检查db的权限

    if (onlyProperties === true) return schema.body.properties

    return schema
  }
  /**
   * 删除文档列定义
   *
   * @param id
   * @returns
   */
  async removeById(id: string): Promise<[boolean, string | null]> {
    // 是否正在使用
    let rst = await this.clMongoObj.findOne({
      schema_id: id,
      type: 'collection',
    })
    if (rst) {
      return [
        false,
        `文档列定义正在被[${rst.database}]数据库中的[${rst.name}]集合使用，不能删除`,
      ]
    }

    const query: any = { _id: new ObjectId(id), type: 'schema' }
    if (this.bucket) query.bucket = this.bucket.name

    return this.clMongoObj.deleteOne(query).then(() => [true])
  }
  /**
   * 简单信息列表，不包含schema定义
   */
  async listSimple(dbName: string, scope = 'document') {
    let query: any
    if (dbName) {
      query = {
        $and: [
          { type: 'schema', scope: { $in: scope.split(',') } },
          {
            $or: [{ 'db.name': dbName }, { db: null }],
          },
        ],
      }
      if (this.bucket?.name) query['$and'].push({ bucket: this.bucket.name })
    } else {
      query = {
        type: 'schema',
        scope: { $in: scope.split(',') },
      }
      if (this.bucket?.name) query.bucket = this.bucket.name
    }

    const schemas = await this.clMongoObj
      .find(query, {
        projection: { _id: 1, title: 1, description: 1, scope: 1, db: 1 },
      })
      .sort('order', 1)
      .toArray()

    return schemas
  }
}

export default Schema
