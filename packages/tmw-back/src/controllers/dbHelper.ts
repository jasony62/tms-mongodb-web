import Helper from 'tmw-kit/dist/ctrl/helper'
import { ModelDb } from 'tmw-kit'
import { nanoid } from 'nanoid'

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
    let modelDb = new ModelDb(this['mongoClient'], info.bucket, this['client'])
    let newName = modelDb.checkDbName(info.name)
    if (newName[0] === false) return [false, newName[1]]
    info.name = newName[1]

    // 查询是否存在同名库
    let existTmwDb = await this.dbByName(info.name)
    if (existTmwDb) return [false, `已存在同名数据库[name=${info.name}]`]

    // 生成数据库系统名
    let existSysDb, sysname
    if (info.sysname) {
      sysname = info.sysname
      existSysDb = await this.dbBySysname(info.sysname)
    } else {
      for (let tries = 0; tries <= 2; tries++) {
        sysname = nanoid(10)
        existSysDb = await this.dbBySysname(sysname)
        if (!existSysDb) break
      }
    }
    if (existSysDb) return [false, '无法生成有效数据库名称']

    info.sysname = sysname

    // 加工数据
    modelDb.processBeforeStore(info, 'insert')

    return this.clMongoObj
      .insertOne(info)
      .then((result) => {
        info._id = result.insertedId
        return [true, info]
      })
      .catch((err) => [false, err.message])
  }
}

export default DbHelper
