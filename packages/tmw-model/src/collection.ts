import * as mongodb from 'mongodb'
import Base from './base'
import unescape from 'mongo-escape'
const ObjectId = mongodb.ObjectId

class Collection extends Base {
  /**
   *
   * @param {object} bucket - 用户存储空间
   */
  constructor(mongoClient, bucket, client, config) {
    super(mongoClient, bucket, client, config)
  }
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
    const baseObj = new Base('', '', '', '')
    const client = await baseObj.mongoClient()
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
    const query: any = { name: clName, type: 'collection' }

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
    const query: any = {
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
  /**
   * 检查是否符合集合中指定的删除约束条件
   * @param {object} tmwCl - 指定的集合管理对象
   * @param {object} query - 指定的删除条件
   * @param {object} sysCl - 系统集合
   *
   * @throws 如果不满足删除条件，抛出异常说明原因
   *
   * @return {boolean} 返回ture，通过检查
   */
  async checkRemoveConstraint(tmwCl, query, sysCl) {
    if (tmwCl.custom && tmwCl.custom.docRemoveConstraint) {
      let { docRemoveConstraint } = tmwCl.custom
      if (typeof docRemoveConstraint === 'object') {
        docRemoveConstraint = unescape(docRemoveConstraint)
        /**检查是否符合用户指定的文档删除规则 */
        let count1 = await sysCl.countDocuments(query)
        let count2 = await sysCl.countDocuments(
          Object.assign({}, query, docRemoveConstraint)
        )
        if (count1 !== count2)
          throw Error('要删除的文档不符合在集合上指定删除限制规则')
      }
    }

    return true
  }
}

export default Collection
