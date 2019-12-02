const { Ctrl, ResultData, ResultFault, ResultObjectNotFound } = require('tms-koa')
const log4js = require('log4js')
const logger = log4js.getLogger('tms-xlsx-etd')
const fileConfig = require(process.cwd() + '/config/fs')
const _ = require('lodash')
const fs = require('fs')
const { Context } = require('../../context')
const ObjectId = require('mongodb').ObjectId
const modelMgdb = require('../../models/mgdb')
// 上传
const { LocalFS } = require('tms-koa/lib/model/fs/local')

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
   * 上传单个文件
   */
  async uploadToImport() {
    if (!this.request.files || !this.request.files.file) {
        return new ResultFault('没有上传文件')
    }
    let { db: dbName, cl: clName } = this.request.query
    if (!dbName || !clName) {
        return new ResultData('参数不完整')
    }
    
    const file = this.request.files.file
    let fs = new LocalFS('upload')
    let filepath = await fs.writeStream(file.name, file)

    let rst = await this._importToCon(dbName, clName, filepath)

    if (rst[0] === true) {
      return new ResultData(rst[1])
    } else {
      return new ResultFault(rst[1])
    }
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

    let rst = await this._importToCon(dbName, clName, filename)

    if (rst[0] === true) {
      return new ResultData(rst[1])
    } else {
      return new ResultFault(rst[1])
    }
  }
  /**
   * 
   */
  async _importToCon(dbName, clName, filename) {
    const xlsx = require('xlsx')
    const wb = xlsx.readFile(filename)
    const firstSheetName = wb.SheetNames[0]
    const sh = wb.Sheets[firstSheetName]
    const json = xlsx.utils.sheet_to_json(sh)

    const client = await Context.mongoClient()
    const table = await modelMgdb.getSchemaByCollection(dbName, clName)
    if (!table.schema) {
      return [false, '指定的集合没有指定集合列']
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
      .then(() => [true, jsonRawRows] )
    } catch (err) {
      logger.warn('Document.insertMany', err)
      return [false, err.message]
    }
  }
  /**
   * 导出数据
   */
  async export() {
    let { db: dbName, cl: clName } = this.request.query

    const client = await Context.mongoClient()
    // 集合列
    const table = await modelMgdb.getSchemaByCollection(dbName, clName)
    if (!table.schema) {
      return new ResultFault('指定的集合没有指定集合列')
    }
    let columns = table.schema.body.properties
    // 集合数据
    let data = await client
      .db(dbName)
      .collection(clName)
      .find()
      .toArray()
    
    const xlsx = require('xlsx')
    const wb = xlsx.utils.book_new()
    const ws = xlsx.utils.json_to_sheet(
      data.map(row => {
        let row2 = {}
        for (const k in columns) {
          let column = columns[k]
          row2[column.title] = row[k]
        }
        return row2
      })
    )
    
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1')
    let path = process.cwd() + "/public"
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path)
    }
    xlsx.writeFile(wb, path + '/' + dbName + '.xlsx')

    
    return "ok"
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
   * 剪切数据到指定库
   */
  async move() {
    const { oldDb, oldCl, newDb, newCl } = this.request.query
    if (!oldDb || !oldCl || !newDb || !newCl) {
      return new ResultFault("参数不完整")
    }
    let { docIds } = this.request.body
    if (!docIds || !Array.isArray(docIds) || docIds.length == 0) {
      return new ResultFault("没有要移动的数据")
    }
    let docIds2 = []
    docIds.forEach( id => {
      docIds2.push(new ObjectId(id))
    })

    //获取指定集合的列
    let newClObj = await modelMgdb.getSchemaByCollection(newDb, newCl)
    if (!newClObj || !newClObj.schema) return new ResultFault("指定的集合不存在")
    let newClSchema = newClObj.schema.body.properties

    // 查询获取旧数据
    let find = {_id:{$in: docIds2}}
    let fields = { _id: 0 }
    // for (const k in newClSchema) {
    //   fields[k] = 1
    // }
    let oldDocus = await modelMgdb.getDocumentByCollection(oldDb, oldCl, find, fields)
    if (oldDocus[0] === false) {
      return new ResultFault(oldDocus[1])
    }
    oldDocus = oldDocus[1]

    // 插入到指定集合中,补充没有的数据
    let newDocs = oldDocus.map( doc => {
      let newd = {}
      for (const k in newClSchema) {
        if (typeof doc[k] === "undefined") {
          newd[k] = ''
        } else {
          newd[k] = doc[k]
        }
      }
      return newd
    })
    const client = await Context.mongoClient()
    const clNew = client.db(newDb).collection(newCl)
    let rst = await clNew
                .insertMany(newDocs)
                .then( rst => [true, rst])
                .catch( err => [false, err.toString()] )
    if (rst[0] === false) {
      return new ResultFault(rst[1])
    }
    rst = rst[1]
    if (rst.insertedCount != newDocs.length) {
      Object.keys(rst.insertedIds).forEach( async (k) => {
        let newId = rst.insertedIds[k]
        await clNew.deleteOne({_id: new ObjectId(newId)})
      })
      return new ResultFault('插入数据数量错误需插入：' + newDocs.length + "；实际插入：" + rst.insertedCount)
    }
    
    // 删除旧数据
    const clOld = client.db(oldDb).collection(oldCl)
    let rst2 = await clOld
      .deleteMany({_id:{$in: docIds2}})
      .then( rst => [true, rst])
      .catch( err => [false, err.toString()] )

    if (rst2[0] === false) {
      return new ResultFault('数据以到指定集合中，但删除旧数据时失败')
    }
    rst2 = rst2[1]

    return new ResultData(rst2.result) 
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
