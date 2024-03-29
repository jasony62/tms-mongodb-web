import mongodb from 'mongodb'
import Base from './base.js'
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

    return this.clMongoObj.findOne(query).then((schema) => {
      if (onlyProperties === true) {
        if (!schema) return false
        return schema.body.properties
      }
      return schema
    })
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
}

export default Schema
