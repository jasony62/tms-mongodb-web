const ObjectId = require('mongodb').ObjectId
const Base = require('./base')

class Collection extends Base {
  /**
   *
   * @param {object} tmwCl
   */
  async getSchemaByCollection(tmwCl) {
    const client = await this.mongoClient()
    const cl = client.db('tms_admin').collection('mongodb_object')
    // 获取表列
    return cl
      .findOne({
        'db.sysname': tmwCl.db.sysname,
        name: tmwCl.name,
        type: 'collection',
      })
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
    const client = await this.mongoClient()
    const cl = client.db('tms_admin').collection('mongodb_object')
    //
    return cl
      .findOne({
        'db.sysname': existDb.sysname,
        name: clName,
        type: 'collection',
      })
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
  checkClName(clName) {
    if (new RegExp('^[a-zA-Z]+[0-9a-zA-Z_]{0,63}$').test(clName) !== true)
      return [
        false,
        '集合名必须以英文字母开头，仅限英文字母或_或数字组合，且最长64位',
      ]

    // 集合名是否存在关键字中
    let keyWord = []
    if (keyWord.includes(clName))
      return [false, '不能以此名作为集合名，请更换为其它名称']

    return [true, clName]
  }
  /**
   * 获得用户指定的集合信息
   *
   * @param {object|string} db - 集合所属数据库
   * @param {string} clName - 用户指定集合名称
   *
   * @returns {object} 集合对象
   */
  async byName(db, clName) {
    const query = { name: clName, type: 'collection' }

    if (typeof db === 'object') query['db.sysname'] = db.sysname
    else if (typeof db === 'string') query['db.name'] = db

    if (this.bucket) query.bucket = this.bucket.name

    const client = await this.mongoClient()
    const clMongoObj = client.db('tms_admin').collection('mongodb_object')

    const cl = await clMongoObj.findOne(query)

    return cl
  }
  /**
   * 在数据库内按系统名称查找集合
   *
   * @param {object} db - 集合所属数据库
   * @param {string} clSysname - 集合系统名称
   *
   * @returns {object} 集合对象
   */
  async bySysname(db, clSysname) {
    const query = {
      'db.sysname': db.sysname,
      sysname: clSysname,
      type: 'collection',
    }
    if (this.bucket) query.bucket = this.bucket.name

    const client = await this.mongoClient()
    const clMongoObj = client.db('tms_admin').collection('mongodb_object')

    const cl = await clMongoObj.findOne(query)

    return cl
  }
}

module.exports = Collection
