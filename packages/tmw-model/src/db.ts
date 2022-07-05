import { Base } from './base'

// 数据库名正则表达式
const DB_NAME_RE = '^[a-zA-Z]+[0-9a-zA-Z_]{0,63}$'

export class Db extends Base {
  constructor(mongoClient, bucket, client, config) {
    super(mongoClient, bucket, client, config)
  }
  /**
   *  检查数据库名
   * @param {string} dbName - 用户指定数据库名称
   */
  checkDbName(dbName) {
    //格式化库名
    if (new RegExp(DB_NAME_RE).test(dbName) !== true)
      return [
        false,
        '库名必须以英文字母开头，可用英文字母或_或数字组合，最长64位',
      ]

    return [true, dbName]
  }
  /**
   * 获得用户指定的数据库信息
   *
   * @param {string} dbName - 用户指定数据库名称
   *
   * @returns {object} 数据库对象
   */
  async byName(dbName) {
    const query: any = { name: dbName, type: 'database' }
    if (this.bucket) query.bucket = this.bucket.name

    const clMongoObj = this.mongoClient
      .db('tms_admin')
      .collection('mongodb_object')

    const db = await clMongoObj.findOne(query)

    return db
  }
}

export default Db
