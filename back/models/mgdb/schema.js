const ObjectId = require('mongodb').ObjectId
const Base = require('./base')

class Schema extends Base {
  /**
   *
   * @param {object} tmwCl
   */
  async bySchemaId(id) {
    const client = await this.mongoClient()
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

module.exports = Schema
