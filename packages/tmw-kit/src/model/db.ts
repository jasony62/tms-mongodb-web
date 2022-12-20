import { Double } from 'mongodb'
import Base from './base'

// 数据库名正则表达式
const DB_NAME_RE = '^[a-zA-Z]+[0-9a-zA-Z_-]{0,63}$'

class Db extends Base {
  // constructor(mongoClient, bucket, client, config) {
  //   super(mongoClient, bucket, client, config)
  // }
  /**
   *  检查数据库名
   * @param {string} dbName - 用户指定数据库名称
   */
  checkDbName(dbName) {
    //格式化库名
    if (new RegExp(DB_NAME_RE).test(dbName) !== true)
      return [
        false,
        '库名必须以英文字母开头，可用英文字母或_或-或数字组合，最长64位',
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
  /**
   *
   */
  async getProfilingStatus(dbOrDbName: string) {
    let db
    if (dbOrDbName && typeof dbOrDbName === 'string')
      db = await this.byName(dbOrDbName)
    else db = dbOrDbName

    const sysDb = this.mongoClient.db(db.sysname)

    const level = await sysDb.profilingLevel()

    const profile = level === 'all' ? 2 : level === 'slow_only' ? 1 : 0

    const result = await sysDb.command({
      profile,
    })

    return result
  }
  /**
   *
   */
  async setProfilingLevel(dbOrDbName: string, params: any) {
    let db
    if (dbOrDbName && typeof dbOrDbName === 'string')
      db = await this.byName(dbOrDbName)
    else db = dbOrDbName

    let { profile = 1, slowms, sampleRate, filter } = params

    const cmd: any = { profile }
    if (slowms && parseInt(slowms)) cmd.slowms = parseInt(slowms)
    if (sampleRate && parseFloat(sampleRate))
      cmd.sampleRate = new Double(sampleRate)
    if (filter && typeof filter === 'object') cmd.filter = filter

    const sysDb = this.mongoClient.db(db.sysname)

    const result = await sysDb.command(cmd)

    return result.ok === 1
  }
  /**
   * 指定管理命令
   */
  async runCommand(dbOrDbName: string, params: any) {
    let result
    if (params.top) {
      let admin = this.mongoClient.db().admin()
      result = await admin.command(params)
    } else {
      let db
      if (dbOrDbName && typeof dbOrDbName === 'string')
        db = await this.byName(dbOrDbName)
      else db = dbOrDbName
      const sysDb = this.mongoClient.db(db.sysname)
      result = await sysDb.command(params)
    }

    return result
  }
}

export default Db
