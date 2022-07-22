import * as mongodb from 'mongodb'
import Base from './base'
const ObjectId = mongodb.ObjectId

class Schema extends Base {
  /**
   *
   * @param {object} tmwCl
   */
  async bySchemaId(id) {
    const client = this.mongoClient
    const cl = client.db('tms_admin').collection('mongodb_object')
    // 获取表列
    return cl
      .findOne({
        _id: new ObjectId(id),
        type: 'schema'
      })
      .then(schema => {
        if (!schema) return false

        return schema.body.properties
      })
  }
}

export default Schema