const Helper = require('./helper')
const ModelCl = require('../models/mgdb/collection')
const { nanoid } = require('nanoid')

/** 数据库控制器辅助类 */
class CollectionHelper extends Helper {
  /**
   * 修改集合名称
   */
  async rename(db, clName, newName) {
    const { name: dbName, sysname } = db
    const client = this.ctrl.mongoClient
    // 检查是否已存在同名集合
    let equalNameSum = await this.clMongoObj
      .find({ name: newName, database: dbName, type: 'collection' })
      .count()
    if (equalNameSum !== 0) return [false, '集合名修改失败！已存在同名集合']

    // 修改集合名
    const query = { name: clName, database: dbName, type: 'collection' }
    if (this.bucket) query.bucket = this.bucket.name
    let clDb = client.db(sysname).collection(clName)
    return clDb
      .rename(newName)
      .then(() => this.clMongoObj.updateOne(query, { $set: { name: newName } }))
      .then((rst) => [true, rst.result])
      .catch((err) => [false, err.message])
  }
  /**
   * 创建集合
   */
  async createCl(existDb, info) {
    let modelCl = new ModelCl()

    // 加工数据
    modelCl.beforeProcessByInAndUp(info, 'insert')

    info.type = 'collection'
    info.database = existDb.name

    info.db = { sysname: existDb.sysname, name: existDb.name }
    if (this.bucket) info.bucket = this.bucket.name

    // 检查指定的集合名
    let [passed, nameOrCause] = modelCl.checkClName(info.name)
    if (passed === false) return [false, nameOrCause]
    info.name = nameOrCause

    // 查询是否已存在同名集合
    let existTmwCl = await modelCl.byName(existDb, info.name)
    if (existTmwCl)
      return [
        false,
        `数据库[name=${existDb.name}]中，已存在同名集合[name=${info.name}]`,
      ]

    // 检查是否指定了用途
    let { usage } = info
    if (usage !== undefined) {
      if (![0, 1].includes(parseInt(usage)))
        return [false, `指定了不支持的集合用途值[usage=${usage}]`]
      info.usage = parseInt(usage)
    }

    // 生成数据库系统名
    let existSysCl, sysname
    for (let tries = 0; tries <= 2; tries++) {
      sysname = nanoid(10)
      existSysCl = await modelCl.bySysname(existDb, sysname)
      if (!existSysCl) break
    }
    if (existSysCl) return [false, '无法生成唯一的集合系统名称']

    info.sysname = sysname

    /**在系统中创建集合后记录集合对象信息 */
    const client = this.ctrl.mongoClient
    const mgdb = client.db(existDb.sysname)

    return mgdb
      .createCollection(info.sysname)
      .then(() => this.clMongoObj.insertOne(info))
      .then((result) => [true, result])
      .catch((err) => [false, err.message])
  }
}

module.exports = CollectionHelper
