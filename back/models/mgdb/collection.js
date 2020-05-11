const ObjectId = require('mongodb').ObjectId
const Base = require('./base')

class Collection extends Base {
  //
  static async getSchemaByCollection(existDb, clName) {
    const model = new Base()
    const client = await model.mongoClient()
    const cl = client.db('tms_admin').collection('mongodb_object')
    // 获取表列
    return cl
      .findOne({ database: existDb.name, name: clName, type: 'collection' })
      .then((myCl) => {
        if (!myCl) {
          return false
        }
        if (myCl.schema_id) {
          return cl
            .findOne({ type: 'schema', _id: new ObjectId(myCl.schema_id) })
            .then((schema) => {
              if (!schema) {
                return false
              }

              return schema.body.properties
            })
        }

        return false
      })
  }
  //
  static async getCollection(existDb, clName) {
    const model = new Base()
    const client = await model.mongoClient()
    const cl = client.db('tms_admin').collection('mongodb_object')
    //
    return cl
      .findOne({ database: existDb.name, name: clName, type: 'collection' })
      .then((result) => result)
      .then((myCl) => {
        if (myCl.schema_id) {
          return cl
            .findOne({ type: 'schema', _id: new ObjectId(myCl.schema_id) })
            .then((schema) => {
              myCl.schema = schema
              delete myCl.schema_id
              return myCl
            })
        }
        delete myCl.schema_id
        return myCl
      })
  }
  /**
   *  检查集合名
   */
  _checkClName(clName) {
    if (new RegExp('^[a-zA-Z]+[0-9a-zA-Z_]{0,63}$').test(clName) !== true)
      return [false, '表名必须以英文字母开头，仅限英文字母或_或数字组合，且最长64位']

    // 集合名是否存在关键字中
    let keyWord = []
    if (keyWord.includes(clName))
      return [false, '不能以此名作为集合名，请更换为其它名称']

    return [true, clName]
  }
}

module.exports = Collection
