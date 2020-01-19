const { ResultData, ResultFault, ResultObjectNotFound } = require('tms-koa')
const DocBase = require('../documentBase')
const log4js = require('log4js')
const logger = log4js.getLogger('tms-xlsx-etd')
const _ = require('lodash')
const fs = require('fs')
const ObjectId = require('mongodb').ObjectId
const modelMgdb = require('../../models/mgdb')
// 上传
const moment = require('tms-koa/node_modules/moment')

class Document extends DocBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * 上传单个文件
   */
  async uploadToImport() {
    const { LocalFS } = require('tms-koa/lib/model/fs/local')

    if (!this.request.files || !this.request.files.file) {
        return new ResultFault('没有上传文件')
    }
    let { db: dbName, cl: clName, checkRepeatColumns = "", keepFirstRepeatData = false } = this.request.query
    if (!dbName || !clName) {
        return new ResultData('参数不完整')
    }
    
    const file = this.request.files.file
    let filePath = moment().format('YYYYMM/DDHH/')
    filePath += file.name

    let fs = new LocalFS('upload')
    let filepath2 = await fs.writeStream(filePath, file)

    let options = {}
    if (checkRepeatColumns) {
      options.unrepeat = {}
      options.unrepeat.columns = checkRepeatColumns.split(',')
      options.unrepeat.keepFirstRepeatData = keepFirstRepeatData ? keepFirstRepeatData : false
    }
    let rst = await this._importToColl(dbName, clName, filepath2, options)

    if (rst[0] === true) {
      return new ResultData("ok")
    } else {
      return new ResultFault(rst[1])
    }
  }
  /**
   * 从excel导入数据
   */
  async import() {
    const fsConfig = require(process.cwd() + '/config/fs')
    let { db: dbName, cl: clName, path, checkRepeatColumns, keepFirstRepeatData = false } = this.request.query
    
    if (!dbName || !clName || !path) {
        return new ResultData('参数不完整')
    }

    let filename = _.get(fsConfig, ['local', 'rootDir'], '') + '/upload/' + path
    if (!fs.existsSync(filename)) return new ResultFault('指定的文件不存在')

    let options = {}
    if (checkRepeatColumns) {
      options.unrepeat = {}
      options.unrepeat.columns = checkRepeatColumns.split(',')
      options.unrepeat.keepFirstRepeatData = keepFirstRepeatData ? keepFirstRepeatData : false
    }
    let rst = await this._importToColl(dbName, clName, filename, options)

    if (rst[0] === true) {
      return new ResultData("ok")
    } else {
      return new ResultFault(rst[1])
    }
  }
  /**
   * 导出数据
   */
  async export() {
    let { db: dbName, cl: clName } = this.request.query

    const client = this.mongoClient
    // 集合列
    let columns = await modelMgdb.getSchemaByCollection(dbName, clName)
    if (!columns) {
      return new ResultFault('指定的集合没有指定集合列')
    }
    // 集合数据
    let data = await client
      .db(dbName)
      .collection(clName)
      .find()
      .toArray()

    const { ExcelCtrl } = require('tms-koa/lib/controller/fs')
    let rst = ExcelCtrl.export(columns, data, clName)

    if (rst[0] === false) {
      return new ResultFault(rst[1])
    }
    rst = rst[1]

    return new ResultData(rst)
  }
  /**
   * 指定数据库下批量新建文档
   */
  bulk() {
    return new ResultData('指定数据库下批量新建文档')
  }
  /**
   * 剪切数据到指定库
   */
  async move() {
    const { oldDb, oldCl, newDb, newCl, transforms, execNum = 100 } = this.request.query
    if (!oldDb || !oldCl || !newDb || !newCl) {
      return new ResultFault("参数不完整")
    }
    let { docIds, filter } = this.request.body
    if (!filter && (!docIds || !Array.isArray(docIds) || docIds.length == 0)) {
      return new ResultFault("没有要移动的数据")
    }

    let docIds2,oldDocus,total
    if (docIds) {
      total = docIds.length
      docIds2 = docIds
    } else { // 按条件
      let find = {}
      if (_.toUpper(filter) !== "ALL") {
        find = this._assembleFind(filter)
      }
      let client = this.mongoClient
      let cl = client.db(oldDb).collection(oldCl)
      oldDocus = await cl
          .find(find)
          .limit(parseInt(execNum))
          .toArray()
      total = await cl
          .find(find)
          .count()
    }

    let options = {}
    options.transforms = transforms
    let rst = await this.cutDocs(oldDb, oldCl, newDb, newCl, docIds2, options, oldDocus)
    if (rst[0] === false) return new ResultFault(rst[1])
    rst = rst[1]

    let spareTotal = total - rst.planMoveTotal
    let data = { planMoveTotal: rst.planMoveTotal, failMoveTotal: rst.planMoveTotal - rst.rstDelOld.result.n, factMoveTotal: rst.rstDelOld.result.n, total, spareTotal }
    return new ResultData(data)
  }
  /**
   *  根据规则获取数据
   */
  async getDocsByRule() {
    let { ruleDb, ruleCl, db, cl, markResultColumn = "import_status", planTotalColumn = "need_sum" } = this.request.query
    if ( !ruleDb || !ruleCl || !db || !cl ) return new ResultFault('参数不完整')
    
    // 获取规则表表头
    let schemas = await modelMgdb.getSchemaByCollection(ruleDb, ruleCl)
    if (!schemas) {
      return new ResultFault('指定的集合没有指定集合列')
    }
    if (markResultColumn && !schemas[markResultColumn]) return new ResultFault('需求表缺少完成状态（' + markResultColumn + '）列')
    if (planTotalColumn && !schemas[planTotalColumn]) return new ResultFault('需求表缺少需求数量（' + planTotalColumn + '）列')

    schemas.exist_total = {type: "string", title: "匹配总数"}

    //取出规则
    const client = this.mongoClient
    let find = {}
    find[planTotalColumn] = { $not: {$in: [null, "", "0"]} }
    find[markResultColumn] = { $in: [null, ""] }
    let rules = await client.db(ruleDb).collection(ruleCl).find(find).toArray()
    if (rules.length == 0) return new ResultFault("未指定规则")

    let data = await this.getDocsByRule2(db, cl, rules, planTotalColumn)
    if (data[0] === false) return new ResultFault(data[1])

    data = data[1]
    let failed = []
    let passed = []
    for (const val of data) {
        if (val.code != 0){
          failed.push(val)
        } else {
          passed.push(val)
        }
    }

    return new ResultData({schemas, failed, passed}) 
  }
  /**
   * 根据规则替换数据
   */
  async replaceDocsByRule() {
    let { db, cl } = this.request.query
    let { rule, dels } = this.request.body

    dels = dels.join(";")
    rule.byId = "notin," + dels
    let rules = [rule]
    let data = await this.getDocsByRule2(db, cl, rules)
    if (data[0] === false) return new ResultFault(data[1])

    data = data[1]
    let failed = []
    let passed = []
    for (const val of data) {
        if (val.code != 0){
          failed.push(val)
        } else {
          passed.push(val)
        }
    }

    return new ResultData({failed, passed})
  }
  /**
   * 根据规则迁移数据 
   */
  async moveByRule() {
    let { ruleDb, ruleCl, oldDb, oldCl, newDb, newCl, markResultColumn = "import_status" } = this.request.query
    if ( !ruleDb || !ruleCl || !oldDb || !oldCl || !newDb || !newCl) {
      return new ResultFault("参数不完整")
    }

    let docsByRule = this.request.body
    if (!docsByRule || !Array.isArray(docsByRule) || docsByRule.length == 0) {
      return new ResultFault("没有要移动的数据")
    }

    const client = this.mongoClient
    let cl = client.db(ruleDb).collection(ruleCl)
    let moveRst = docsByRule.map( async value => {
      let ruleId = value.ruleId
      let docIds = value.docIds
      let rst = await this.cutDocs(oldDb, oldCl, newDb, newCl, docIds)
      if (rst[0] === false) {
        // 将结果存入需求表中
        if (markResultColumn) {
          let set = {}
          set[markResultColumn] = "失败：" + rst[1]
          await cl.updateOne({ _id: ObjectId(ruleId) }, { $set: set })
        }
        return { ruleId: ruleId, code: 500, msg: rst[1] }
      }

      rst = rst[1]
      if (rst.planMoveTotal != rst.rstDelOld.result.n) {
        if (markResultColumn) {
          let set = {}
          set[markResultColumn] = "异常：需求数量" + rst.planMoveTotal + "与实际迁移数量" + rst.rstDelOld.result.n + "不符"
          await cl.updateOne({ _id: ObjectId(ruleId) }, { $set: set })
        }
        return { ruleId: ruleId, code: 500, msg: "需求数量" + rst.planMoveTotal + "与实际迁移数量" + rst.rstDelOld.result.n + "不符" }
      }

      if (markResultColumn) {
        let set = {}
        set[markResultColumn] = "成功"
        await cl.updateOne({ _id: ObjectId(ruleId) }, { $set: set })
      }

      return { ruleId: ruleId, code: 0, msg: "成功" }
    })

    return Promise.all(moveRst).then( rst => {
      return new ResultData(rst)
    })
  }
}
module.exports = Document
