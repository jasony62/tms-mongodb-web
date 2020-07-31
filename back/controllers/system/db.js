const { ResultData, ResultFault } = require('tms-koa')
const ObjectId = require('mongodb').ObjectId
const Base = require('./base')
const modelDb = require('../../models/mgdb/db')

class Db extends Base {
  constructor(...args) {
    super(...args)
  }
  /**
   * 新建预制数据库
   */
  async create() {
    let info = this.request.body
    info.type = 'database'

    // 检查数据库名
    let model = new modelDb()
    let newName = model._checkDbName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    info.name = newName[1]

    // 查询是否存在同名库
    let existDb = await this.helper.dbByName(info.name)
    if (existDb) return new ResultFault('已存在同名预制数据库')

    return this.clPreset
      .insertOne(info)
      .then((result) => new ResultData(result.ops[0]))
  }
  /**
   * 更新数据库对象信息
   */
  async update() {
    const beforeDb = await this.helper.findRequestDb()

    let info = this.request.body
    let { _id, ...updatedInfo } = info

    let existDb = await this.helper.dbByName(info.name)
    if (existDb) return new ResultFault('已存在同名预制数据库')

    const query = { _id: ObjectId(beforeDb._id) }

    return this.clPreset
      .updateOne(query, { $set: updatedInfo })
      .then(() => new ResultData(info))
  }
  /**
   * 删除数据
   */
  async remove() {
    const existDb = await this.helper.findRequestDb()

    const cl = this.clPreset

    // 查找数据库下是否有集合，如果有则不能删除
    const query = { database: existDb.name, type: 'collection' }
    let colls = await cl.find(query).toArray()
    if (colls.length > 0)
      return new ResultFault('删除失败，此库中存在未删除的集合')

    return cl
      .deleteOne({ _id: ObjectId(existDb._id) })
      .then(() => new ResultData('ok'))
  }
  /**
   *
   */
  async list() {
    const query = { type: 'database' }
    const tmsDbs = await this.clPreset
      .find(query, { projection: { _id: 0, type: 0 } })
      .toArray()

    return new ResultData(tmsDbs)
  }
}
module.exports = Db
