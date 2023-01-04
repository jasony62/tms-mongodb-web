import * as mongodb from 'mongodb'
import Base from './base'
const ObjectId = mongodb.ObjectId

class Schema extends Base {
  /**
   * 根据ID获得字段定义
   * @param {object} tmwCl
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
  async byName(name: string, { onlyProperties = true } = {}) {
    let query: any = { name, type: 'schema' }
    if (this.bucket) query.bucket = this.bucket.name

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
