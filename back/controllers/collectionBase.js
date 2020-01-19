const _ = require('lodash')
const { Ctrl, ResultData, ResultFault } = require('tms-koa')
const ObjectId = require('mongodb').ObjectId

class CollectionBase extends Ctrl {
  constructor(...args) {
    super(...args)
  }
  /**
   *
   */
  async byName() {
    const { db: dbName, cl: clName } = this.request.query
    const client = this.mongoClient
    const cl = client.db('tms_admin').collection('mongodb_object')
    return cl
      .findOne({ database: dbName, name: clName, type: 'collection' })
      .then(result => result)
      .then(myCl => {
        if (myCl.schema_id) {
          return cl
            .findOne({ type: 'schema', _id: new ObjectId(myCl.schema_id) })
            .then(schema => {
              myCl.schema = schema
              delete myCl.schema_id
              return myCl
            })
        }
        delete myCl.schema_id
        return myCl
      })
      .then(myCl => new ResultData(myCl))
  }
  /**
   * 指定库下所有的集合
   */
  async list() {
    let { db: dbName } = this.request.query
    const client = this.mongoClient
    const p1 = client
      .db(dbName)
      .listCollections({}, { nameOnly: true })
      .toArray()
      .then(collections => collections.map(c => c.name))
    const clMongoObj = client.db('tms_admin').collection('mongodb_object')
    const p2 = clMongoObj
      .find({ type: 'collection', database: dbName })
      .toArray()
    return Promise.all([p1, p2]).then(values => {
      const [rawClNames, tmsCls] = values
      const tmsClNames = tmsCls.map(c => c.name)
      const diff = _.difference(rawClNames, tmsClNames)
      diff.forEach(name => tmsCls.push({ name }))
      return new ResultData(tmsCls)
    })
  }
  /**
   *  检查集合名
   */
  _checkClName(clName) {
    if (clName.search(/[\u4E00-\u9FA5]|[\uFE30-\uFFA0]/gi) !== -1) return [false, "集合名不能包含中文"]

    let newName = clName.replace(/\s/g,"")
    if (!newName) return [false, "集合名不能为空"]
    if (!isNaN(newName)) return [false, "集合名不能全为数字"]

    return [true, newName]
  }
  /**
   * 指定数据库下新建集合
   */
  async create() {
    let { db: dbName } = this.request.query
    const info = this.request.body
    info.type = 'collection'
    info.database = dbName

    // 检查集合名
    let newName = this._checkClName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    info.name = newName[1] 

    const client = this.mongoClient
    let cl = client.db(dbName)

    // 查询是否已存在同名集合
    let cls = await cl.listCollections({ name: info.name}, { nameOnly: true }).toArray()
    if (cls.length > 0) {
      return new ResultFault("已存在同名集合")
    }

    return cl
      .createCollection(info.name)
      .then(() => client.db('tms_admin').collection('mongodb_object'))
      .then(cl => cl.insertOne(info))
      .then(result => new ResultData(result.ops[0]))
  }
  /**
   * 更新集合对象信息
   */
  async update() {
    let { db: dbName, cl: clName } = this.request.query
    let info = this.request.body
    
    // 格式化集合名
    let newClName = this._checkClName(info.name)
    if (newClName[0] === false) return new ResultFault(newClName[1])
    newClName = newClName[1] 

    info = _.omit(info, ['_id', 'name', 'database', 'type'])
    const client = this.mongoClient
    const cl = client.db('tms_admin').collection('mongodb_object')
    let rst = await cl
        .updateOne(
          { database: dbName, name: clName, type: 'collection' },
          { $set: info },
          { upsert: true }
        )
        .then((rst) => [true, rst.result])
        .catch(err => [false, err.message])
        
    if (rst[0] === false) return new ResultFault(rst[1])
    if (newClName === clName) {
      return new ResultData(rst[1])
    }
    // 更改集合名
    let rst2 = await this._rename(dbName, clName, newClName)

    if (rst2[0] === true) 
      return new ResultData(rst2[1])
    else 
      return new ResultFault(rst2[1])

  }
  /**
   * 修改集合名称
   */
  async rename() {
    let { db: dbName, cl: clName, newName } = this.request.query

    //格式化集合名
    newName = this._checkClName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    newName = newName[1] 

    let rst = await this._rename(dbName, clName, newName)

    if (rst[0] === true) 
      return new ResultData(rst[1])
    else 
      return new ResultFault(rst[1])
  }
  /**
   * 
   */
  async _rename(dbName, clName, newName) {
    const client = this.mongoClient
    // 检查是否已存在同名集合
    let clAdmin = client.db('tms_admin').collection('mongodb_object')
    let equalNameSum = await clAdmin.find({name: newName, database: dbName, type: "collection"}).count()
    if (equalNameSum !== 0) return [ false, "集合名修改失败！已存在同名集合"]

    // 修改集合名
    let clDb = client.db(dbName).collection(clName)
    return clDb
        .rename(newName)
        .then(() => clAdmin.updateOne({name: clName, database: dbName, type: "collection"}, {$set: {name: newName}}))
        .then((rst) => [true, rst.result])
        .catch(err => [false, err.message])
  }
  /**
   * 删除集合
   */
  async remove() {
    let { db: dbName, cl: clName } = this.request.query

    // 如(果是系统自带集合不能删除
    if ((dbName === "admin" && clName === "system.version") || (dbName === "config" && clName === "system.sessions") || (dbName === "local" && clName === "startup_log") || (dbName === "tms_admin" && clName === "mongodb_object")) return new ResultFault("系统自带集合，不能删除")

    const client = this.mongoClient
    const db = client.db('tms_admin')
    return db
      .collection('mongodb_object')
      .deleteOne({ name: clName, type: 'collection' })
      .then(() => client.db(dbName).dropCollection(clName))
      .then(() => new ResultData('ok'))
      .catch(err => new ResultFault(err.message))
  }
}

module.exports = CollectionBase
