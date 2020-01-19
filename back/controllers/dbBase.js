const _ = require('lodash')
const { Ctrl, ResultData, ResultFault } = require('tms-koa')

class DbBase extends Ctrl {
  constructor(...args) {
    super(...args)
  }
  /**
   * 
   */
  async list() {
    const client = this.mongoClient
    const adminDb = client.db().admin()
    const p1 = adminDb
      .listDatabases({ nameOnly: true })
      .then(result => result.databases.map(db => db.name))
    const clMongoObj = client.db('tms_admin').collection('mongodb_object')
    const p2 = clMongoObj.find({ type: 'database' }).toArray()
    return Promise.all([p1, p2]).then(values => {
      const [rawDbNames, tmsDbs] = values
      const tmsDbNames = tmsDbs.map(tmsDb => tmsDb.name)
      const diff = _.difference(rawDbNames, tmsDbNames)
      diff.forEach(name => tmsDbs.push({ name }))
      return new ResultData(tmsDbs)
    })
  }
  /**
   * 新建数据库
   *
   * 只有创建集合（foo），创建数据库才生效
   */
  async create() {
    let info = this.request.body
    info.type = 'database'

    //格式化库名
    if (info.name.search(/[\u4E00-\u9FA5]|[\uFE30-\uFFA0]/gi) !== -1) return new ResultFault("库名不能包含中文")
    info.name = info.name.replace(/\s/g,"")
    if (!info.name) return new ResultFault("库名不能为空")
    if (!isNaN(info.name)) return new ResultFault("库名不能全为数字")

    const client = this.mongoClient
    let cl = client.db('tms_admin').collection('mongodb_object')

    // 查询库名是否是mongodb自带数据库
    if (["admin", "config", "local", "tms_admin"].includes(info.name)) return new ResultFault("不能用mongodb自带数据库作为库名")
    // 查询是否存在同名库
    let dbs = await cl.find({ name: info.name, type: 'database' }).toArray()
    if (dbs.length > 0) {
      return new ResultFault("已存在同名数据库")
    }

    return cl
      .insertOne(info)
      .then(result => new ResultData(result.ops[0]))
  }
  /**
   * 更新数据库对象信息
   */
  async update() {
    const dbName = this.request.query.db
    let info = this.request.body
    info = _.omit(info, ['_id', 'name'])
    const client = this.mongoClient
    const db = client.db('tms_admin')
    return db
      .collection('mongodb_object')
      .updateOne(
        { name: dbName, type: 'database' },
        { $set: info }
      )
      .then(() => new ResultData(info))
  }
}
module.exports = DbBase
