const { Ctrl, ResultData, ResultFault, ResultObjectNotFound } = require('tms-koa')
const fileConfig = require(process.cwd() + '/config/fs')
const _ = require('lodash')
const fs = require('fs')
const { Context } = require('../../context')
const ObjectId = require('mongodb').ObjectId

class Document extends Ctrl {
  /**
   * 指定数据库指定集合下的文档
   */
  async list() {
    const { db: dbName, cl: clName } = this.request.query
    const client = await Context.mongoClient()
    return client
      .db(dbName)
      .collection(clName)
      .find()
      .toArray()
      .then(docs => new ResultData(docs))
  }
  /**
   * 指定数据库指定集合下新建文档
   */
  async create() {
    const { db: dbName, cl: clName } = this.request.query
    const doc = this.request.body
    const client = await Context.mongoClient()
    return client
      .db(dbName)
      .collection(clName)
      .insertOne(doc)
      .then(() => new ResultData(doc))
  }
  /**
   * 从excel导入数据
   */
  async import() {
    let { db: dbName, cl: clName, path } = this.request.query
    
    if (!dbName || !clName || !path) {
        return new ResultData('参数不完整')
    }

    let filename = _.get(fileConfig, ['local', 'rootDir'], '') + '/upload/' + path
    if (!fs.existsSync(filename)) return new ResultFault('指定的文件不存在')

    const xlsx = require('xlsx')
    const wb = xlsx.readFile(filename)
    const firstSheetName = wb.SheetNames[0]
    const sh = wb.Sheets[firstSheetName]
    const json = xlsx.utils.sheet_to_json(sh)

    const client = await Context.mongoClient()
    const cl = client.db('tms_admin').collection('mongodb_object')
    // 获取表列
    const table = await cl
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
    if (!table.schema) {
      return new ResultFault('指定的集合没有指定集合列')
    }
    let columns = table.schema.body.properties

    const jsonRawRows = json.map(row => {
      let newRow = {}
      for (const k in columns) {
        let column = columns[k]
        newRow[k] = row[column.title]
      }
      return newRow
    })
    
    try {
      return client
      .db(dbName)
      .collection(clName)
      .insertMany(jsonRawRows)
      .then(() => new ResultData(jsonRawRows))
    } catch (err) {
      logger.warn('Document.insertMany', err)
      return new ResultFault(err.message)
    }
  }
  /**
   * 指定数据库下批量新建文档
   */
  bulk() {
    return new ResultData('指定数据库下批量新建文档')
  }
  /**
   * 删除指定数据库指定集合下的文档
   */
  remove() {
    return new ResultData('删除指定数据库指定集合下的文档')
  }
  /**
   * 更新指定数据库指定集合下的文档
   */
  async update() {
    const { db: dbName, cl: clName, id } = this.request.query
    let doc = this.request.body
    doc = _.omit(doc, ['_id'])
    const client = await Context.mongoClient()
    return client
      .db(dbName)
      .collection(clName)
      .updateOne({ _id: ObjectId(id) }, { $set: doc })
      .then(() => new ResultData(doc))
  }
}
module.exports = Document
