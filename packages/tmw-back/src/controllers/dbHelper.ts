import { Helper } from 'tmw-kit/dist/ctrl/index.js'
import { ModelDb } from 'tmw-kit'

/**
 * 数据库控制器辅助类
 */
class DbHelper extends Helper {
  /**
   * 在系统范围内按名称查找数据库
   *
   * @param {string} sysname
   */
  async dbBySysname(sysname) {
    const query = { sysname, type: 'database' }

    const db = await this.clMongoObj.findOne(query)

    return db
  }
  /**
   * 在bucket范围内按名称查找数据库
   *
   * @param {string} name
   */
  async dbByName(name) {
    const query: any = { name, type: 'database' }
    if (this.ctrl.bucket) query.bucket = this.ctrl.bucket.name

    const db = await this.clMongoObj.findOne(query)

    return db
  }
  /**
   * 创建数据库
   *
   * @param {string} name
   */
  async dbCreate(info) {
    info.type = 'database'

    // 检查数据库名
    let modelDb = new ModelDb(
      this.ctrl.mongoClient,
      info.bucket,
      this.ctrl.client
    )

    return await modelDb.create(info)
  }
}

export default DbHelper
