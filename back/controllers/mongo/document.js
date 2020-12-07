const { ResultData, ResultFault, ResultObjectNotFound } = require('tms-koa')
const DocBase = require('../documentBase')
const _ = require('lodash')
const ObjectId = require('mongodb').ObjectId
const ModelColl = require('../../models/mgdb/collection')
const ModelDoc = require('../../models/mgdb/document')

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
    const existCl = await this.docHelper.findRequestCl()
    const {
      checkRepeatColumns = '',
      keepFirstRepeatData = false,
    } = this.request.query

    const { UploadPlain } = require('tms-koa/lib/model/fs/upload')
    const { LocalFS } = require('tms-koa/lib/model/fs/local')
    const { FsContext } = require('tms-koa').Context

    const file = this.request.files.file
    const fsContextIns = FsContext.insSync()
    const domain = fsContextIns.getDomain(fsContextIns.defaultDomain)
    const tmsFs = new LocalFS(domain)
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

    let rst = await this.docHelper.importToColl(existCl, filepath, options)

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
    const { filter, docIds } = this.request.body

    let modelDoc = new ModelDoc(this.bucket)

    let query
    if (docIds && docIds.length > 0) {
      // 按选中修改
      let docIds2 = docIds.map((id) => new ObjectId(id))
      query = { _id: { $in: docIds2 } }
    } else if (filter && typeof filter === 'object') {
      // 按条件修改
      query = modelDoc.assembleQuery(filter)
    } else if (typeof filter === 'string' && filter === 'ALL') {
      //修改全部
      query = {}
    } else {
      return new ResultFault('没有要导出的数据')
    }

    const existCl = await this.docHelper.findRequestCl()
    // 集合列
    let modelCl = new ModelColl(this.bucket)
    let columns = await modelCl.getSchemaByCollection(existCl)
    if (!columns) return new ResultFault('指定的集合没有指定集合列')

    const client = this.mongoClient
    // 集合数据
    let data = await client
      .db(existCl.db.sysname)
      .collection(existCl.sysname)
      .find(query)
      .toArray()

    // 数据处理-针对单选多选转化
    this.docHelper.transformsCol('toLabel', data, columns)

    const { ExcelCtrl } = require('tms-koa/lib/controller/fs')
    let rst = ExcelCtrl.export(columns, data, existCl.name + '.xlsx')

    if (rst[0] === false) return new ResultFault(rst[1])

    rst = rst[1]

    return new ResultData(rst)
  }
  /**
   * 剪切文档到指定集合
   *
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

    let { docIds, filter } = this.request.body

    if (!oldDb || !oldCl || !newDb || !newCl) {
      return new ResultFault('参数不完整')
    }
    if (!filter && (!Array.isArray(docIds) || docIds.length == 0)) {
      return new ResultFault('没有要移动的数据')
    }

    let modelCl = new ModelColl()
    const oldExistCl = await modelCl.byName(oldDb, oldCl)
    const newExistCl = await modelCl.byName(newDb, newCl)

    let modelDoc = new ModelDoc(this.bucket)

    let docIds2, oldDocus, total
    if (docIds) {
      total = docIds.length
      docIds2 = docIds
    } else {
      // 按条件
      let query = {}
      if (_.toUpper(filter) !== 'ALL') {
        query = modelDoc.assembleQuery(filter)
      }
      let cl = this.docHelper.findSysColl(oldExistCl)
      oldDocus = await cl.find(query).limit(parseInt(execNum)).toArray()
      total = await cl.find(query).count()
    }

    let options = {}
    options.transforms = transforms

    let rst = await this.docHelper.cutDocs(
      oldExistCl,
      newExistCl,
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
}

module.exports = Document
