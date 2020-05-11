const { ResultData, ResultFault, ResultObjectNotFound } = require('tms-koa')
const DocBase = require('../documentBase')
const _ = require('lodash')
const fs = require('fs')
const ObjectId = require('mongodb').ObjectId
const modelColl = require('../../models/mgdb/collection')

class Document extends DocBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * 上传并导入单个文件
   */
  async uploadToImport() {
    if (!this.request.files || !this.request.files.file) {
      return new ResultFault('没有上传文件')
    }
    const {
      db: dbName,
      cl: clName,
      checkRepeatColumns = '',
      keepFirstRepeatData = false,
    } = this.request.query
    if (!dbName || !clName) {
      return new ResultData('参数不完整')
    }

    const { UploadPlain } = require('tms-koa/lib/model/fs/upload')
    const { LocalFS } = require('tms-koa/lib/model/fs/local')
    const { FsContext } = require('tms-koa').Context

    const fsContextIns = FsContext.insSync()
    const domain = fsContextIns.getDomain(fsContextIns.defaultDomain)
    const tmsFs = new LocalFS(domain)
    const file = this.request.files.file
    const upload = new UploadPlain(tmsFs)
    let filepath
    try {
      filepath = await upload.store(file, '', 'Y')
    } catch (e) {
      return new ResultFault(e.message)
    }
    let options = {}
    if (checkRepeatColumns) {
      options.unrepeat = {}
      options.unrepeat.columns = checkRepeatColumns.split(',')
      options.unrepeat.keepFirstRepeatData = keepFirstRepeatData
        ? keepFirstRepeatData
        : false
    }
    
    const existDb = await this.docHelper.findRequestDb()
    let rst = await this._importToColl(existDb, clName, filepath, options)

    if (rst[0] === true) {
      return new ResultData('ok')
    } else {
      return new ResultFault(rst[1])
    }
  }
  /**
   * 导出数据
   */
  async export() {
    let { db: dbName, cl: clName } = this.request.query

    const existDb = await this.docHelper.findRequestDb()
    // 集合列
    let columns = await modelColl.getSchemaByCollection(existDb, clName)
    if (!columns) {
      return new ResultFault('指定的集合没有指定集合列')
    }
    
    const client = this.mongoClient
    // 集合数据
    let data = await client.db(existDb.sysname).collection(clName).find().toArray()

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
   * @execNum 本次最大迁移数
   * @planTotal 总计划迁移数
   * @alreadyMoveTotal 已经迁移的个数
   * @alreadyMovePassTotal 已经迁移成功的个数
   */
  async move() {
    let {
      oldDb,
      oldCl,
      newDb,
      newCl,
      transforms,
      execNum = 100,
      planTotal = 0,
      alreadyMoveTotal = 0,
      alreadyMovePassTotal = 0,
    } = this.request.query
    if (!oldDb || !oldCl || !newDb || !newCl) {
      return new ResultFault('参数不完整')
    }
    let { docIds, filter } = this.request.body
    if (!filter && (!docIds || !Array.isArray(docIds) || docIds.length == 0)) {
      return new ResultFault('没有要移动的数据')
    }

    const oldExistDb = await this.docHelper.findRequestDb(true, oldDb)
    const newExistDb = await this.docHelper.findRequestDb(true, newDb)

    let docIds2, oldDocus, total
    if (docIds) {
      total = docIds.length
      docIds2 = docIds
    } else {
      // 按条件
      let find = {}
      if (_.toUpper(filter) !== 'ALL') {
        find = this._assembleFind(filter)
      }
      let client = this.mongoClient
      let cl = client.db(oldExistDb.sysname).collection(oldCl)
      oldDocus = await cl.find(find).limit(parseInt(execNum)).toArray()
      total = await cl.find(find).count()
    }

    let options = {}
    options.transforms = transforms
    let rst = await this.cutDocs(
      oldExistDb,
      oldCl,
      newExistDb,
      newCl,
      docIds2,
      options,
      oldDocus
    )
    if (rst[0] === false) return new ResultFault(rst[1])
    rst = rst[1]

    //
    if (planTotal == 0) planTotal = parseInt(total) // 计划总需要迁移数
    alreadyMoveTotal = parseInt(alreadyMoveTotal) + parseInt(rst.planMoveTotal) // 已经迁移数
    let spareTotal = parseInt(planTotal) - alreadyMoveTotal // 剩余迁移数
    alreadyMovePassTotal =
      parseInt(alreadyMovePassTotal) + parseInt(rst.rstDelOld.result.n) // 已经成功迁移数
    let alreadyMoveFailTotal = alreadyMoveTotal - alreadyMovePassTotal // 已经迁移失败的数量
    let data = {
      planTotal,
      alreadyMoveTotal,
      alreadyMovePassTotal,
      alreadyMoveFailTotal,
      spareTotal,
    }
    return new ResultData(data)
  }
  /**
   *
   */
  async _getDocsByRule(again = false) {
    let {
      ruleDb: ruleDbName,
      ruleCl: ruleClName,
      db: dbName,
      cl: clName,
      markResultColumn = 'import_status',
      planTotalColumn = 'need_sum',
    } = this.request.query
    if (!ruleDbName || !ruleClName || !dbName || !clName) return [false, '参数不完整']

    
    const ruleExistDb = await this.docHelper.findRequestDb(true, ruleDbName)
    const existDb = await this.docHelper.findRequestDb(true, dbName)

    // 获取规则表表头
    let schemas = await modelColl.getSchemaByCollection(ruleExistDb, ruleClName)
    if (!schemas) {
      return [false, '指定的集合没有指定集合列']
    }
    if (markResultColumn && !schemas[markResultColumn])
      return [false, '需求表缺少完成状态（' + markResultColumn + '）列']
    if (planTotalColumn && !schemas[planTotalColumn])
      return [false, '需求表缺少需求数量（' + planTotalColumn + '）列']

    schemas.exist_total = { type: 'string', title: '匹配总数' }

    //取出规则
    const client = this.mongoClient
    let find = {}
    find[planTotalColumn] = { $not: { $in: [null, '', '0'] } }
    if (again !== true) find[markResultColumn] = { $in: [null, ''] }
    let rules = await client.db(ruleExistDb.sysname).collection(ruleClName).find(find).toArray()
    if (rules.length == 0) return [false, '未指定规则或已使用的规则']

    let data = await this.getDocsByRule2(existDb, clName, rules, planTotalColumn)
    if (data[0] === false) return [false, data[1]]

    data = data[1]
    let failed = []
    let passed = []
    for (const val of data) {
      if (val.code != 0) {
        failed.push(val)
      } else {
        passed.push(val)
      }
    }

    return [true, { schemas, failed, passed }]
  }
  /**
   *  根据规则获取数据
   */
  async getDocsByRule() {
    let data = await this._getDocsByRule()
    if (data[0] === false) return new ResultFault(data[1])

    return new ResultData(data[1])
  }

  /**
   *  导出根据规则获取得数据详情
   */
  async exportDocsByRule() {
    let data = await this._getDocsByRule(true)
    if (data[0] === false) return new ResultFault(data[1])

    let { schemas, failed, passed } = data[1]
    schemas.msg = { type: 'string', title: '自动分配情况' }
    let docs = _.concat(failed, passed)
    docs.forEach((doc) => {
      if (doc.import_status === '成功') {
        doc.msg = ''
        doc.exist_total = ''
      }
    })

    const { ExcelCtrl } = require('tms-koa/lib/controller/fs')
    let rst = ExcelCtrl.export(
      schemas,
      docs,
      '根据规则表【' + this.request.query.ruleCl + '】获取数据'
    )
    if (rst[0] === false) {
      return new ResultFault(rst[1])
    }
    rst = rst[1]

    return new ResultData(rst)
  }
  /**
   * 根据规则替换数据
   */
  async replaceDocsByRule() {
    let { db, cl } = this.request.query
    let { rule, dels } = this.request.body

    dels = dels.join(',')
    rule.byId = 'notin:' + dels
    let rules = [rule]
    const existDb = await this.docHelper.findRequestDb()
    let data = await this.getDocsByRule2(existDb, cl, rules)
    if (data[0] === false) return new ResultFault(data[1])

    data = data[1]
    let failed = []
    let passed = []
    for (const val of data) {
      if (val.code != 0) {
        failed.push(val)
      } else {
        passed.push(val)
      }
    }

    return new ResultData({ failed, passed })
  }
  /**
   * 根据规则迁移数据
   */
  async moveByRule() {
    let {
      ruleDb: ruleDbName,
      ruleCl: ruleClName,
      oldDb: oldDbName,
      oldCl: oldClName,
      newDb: newDbName,
      newCl: newClName,
      markResultColumn = 'import_status',
    } = this.request.query
    if (!ruleDbName || !ruleClName || !oldDbName || !oldClName || !newDbName || !newClName) {
      return new ResultFault('参数不完整')
    }

    let docsByRule = this.request.body
    if (!docsByRule || !Array.isArray(docsByRule) || docsByRule.length == 0) {
      return new ResultFault('没有要移动的数据')
    }

    const ruleExistDb = await this.docHelper.findRequestDb(true, ruleDbName)
    const oldExistDb = await this.docHelper.findRequestDb(true, oldDbName)
    const newExistDb = await this.docHelper.findRequestDb(true, newDbName)

    const client = this.mongoClient
    let cl = client.db(ruleExistDb.sysname).collection(ruleClName)
    let moveRst = docsByRule.map(async (value) => {
      let ruleId = value.ruleId
      let docIds = value.docIds
      let rst = await this.cutDocs(oldExistDb, oldClName, newExistDb, newClName, docIds)
      if (rst[0] === false) {
        // 将结果存入需求表中
        if (markResultColumn) {
          let set = {}
          set[markResultColumn] = '失败：' + rst[1]
          await cl.updateOne({ _id: ObjectId(ruleId) }, { $set: set })
        }
        return { ruleId: ruleId, code: 500, msg: rst[1] }
      }

      rst = rst[1]
      if (rst.planMoveTotal != rst.rstDelOld.result.n) {
        if (markResultColumn) {
          let set = {}
          set[markResultColumn] =
            '异常：需求数量' +
            rst.planMoveTotal +
            '与实际迁移数量' +
            rst.rstDelOld.result.n +
            '不符'
          await cl.updateOne({ _id: ObjectId(ruleId) }, { $set: set })
        }
        return {
          ruleId: ruleId,
          code: 500,
          msg:
            '需求数量' +
            rst.planMoveTotal +
            '与实际迁移数量' +
            rst.rstDelOld.result.n +
            '不符',
        }
      }

      if (markResultColumn) {
        let set = {}
        set[markResultColumn] = '成功'
        await cl.updateOne({ _id: ObjectId(ruleId) }, { $set: set })
      }

      return { ruleId: ruleId, code: 0, msg: '成功' }
    })

    return Promise.all(moveRst).then((rst) => {
      return new ResultData(rst)
    })
  }
}
module.exports = Document
