import * as mongodb from 'mongodb'
import Base from './base'
const ObjectId = mongodb.ObjectId

class Schema extends Base {
  /**
   * 根据ID获得字段定义
   */
  async bySchemaId(id, { onlyProperties = true } = {}) {
    let query = {
      _id: new ObjectId(id),
      type: 'schema',
    }

    return this.clMongoObj.findOne(query).then((schema) => {
      if (onlyProperties === true) {
        if (!schema) return false
        return schema.body.properties
      }
      return schema
    })
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

    return this.clMongoObj.findOne(query).then((schema) => {
      if (onlyProperties === true) {
        if (!schema) return false
        return schema.body.properties
      }
      return schema
    })
  }
}

export default Schema
