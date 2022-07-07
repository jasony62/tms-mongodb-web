import { ResultData, ResultFault } from 'tms-koa'
import DocBase from '../documentBase'
import * as _ from 'lodash'
import { ModelCl, ModelDoc } from 'tmw-model'
import * as mongodb from 'mongodb'
const ObjectId = mongodb.ObjectId

import * as path from 'path'
import * as fs from 'fs'
let TMWCONFIG
let cnfpath = path.resolve(process.cwd() + '/config/app.js')
if (fs.existsSync(cnfpath)) {
  TMWCONFIG = require(process.cwd() + '/config/app').tmwConfig
} else {
  TMWCONFIG = {
    TMS_APP_DEFAULT_CREATETIME: 'TMS_DEFAULT_CREATE_TIME',
    TMS_APP_DEFAULT_UPDATETIME: 'TMS_DEFAULT_UPDATE_TIME',
    TMS_APP_DATA_ACTION_LOG: 'N'
  }
}

class Document extends DocBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * 上传并导入单个文件
   */
  async uploadToImport() {
    if (!this["request"].files || !this["request"].files.file) {
      return new ResultFault('没有上传文件')
    }
    const existCl = await this["docHelper"].findRequestCl()
    const { UploadPlain } = require('tms-koa/lib/model/fs/upload')
    const { LocalFS } = require('tms-koa/lib/model/fs/local')
    const { FsContext } = require('tms-koa').Context

    const file = this["request"].files.file
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
    // 去重校验
    const { operateRules } = existCl
    let noRepeatConfig = null
    if (operateRules && operateRules.scope && operateRules.scope.unrepeat) {
      const {
        database: { name: dbName },
        collection: { name: clName },
        primaryKeys,
        insert,
      } = operateRules.unrepeat
      noRepeatConfig = {
        config: {
          columns: primaryKeys,
          db: dbName,
          cl: clName,
          insert: insert,
        },
      }
    }

    let rst = await this["docHelper"].importToColl(
      existCl,
      filepath,
      noRepeatConfig
    )

    let result = null
    if (rst[0] === true) {
      result = {
        importAll: true,
        message: `导入成功`,
      }
    } else {
      result = {
        importAll: false,
        message: `导入失败,${rst[1]}`,
      }
    }
    return new ResultData(result)
  }
  /**
   * 导出数据
   */
  async export() {
    let { filter, docIds, columns } = this["request"].body

    let modelDoc = new ModelDoc(this["mongoClient"], this["bucket"], this["client"])

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

    const existCl = await this["docHelper"].findRequestCl()
    // 集合列
    let modelCl = new ModelCl(this["mongoClient"], this["bucket"], this["client"])
    columns = columns ? columns : await modelCl.getSchemaByCollection(existCl)
    if (!columns) return new ResultFault('指定的集合没有指定集合列')

    const client = this["mongoClient"]
    // 集合数据
    let data = await client
      .db(existCl.db.sysname)
      .collection(existCl.sysname)
      .find(query)
      .toArray()

    // 数据处理-针对单选多选转化
    this["docHelper"].transformsCol('toLabel', data, columns)

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
      execNum = 100,
      planTotal = 0,
      alreadyMoveTotal = 0,
      alreadyMovePassTotal = 0,
    } = this["request"].query

    let { docIds, filter } = this["request"].body

    if (!filter && (!Array.isArray(docIds) || docIds.length == 0)) {
      return new ResultFault('没有要移动的数据')
    }

    let modelCl = new ModelCl(this["mongoClient"], this["bucket"], this["client"])
    let modelDoc = new ModelDoc(this["mongoClient"], this["bucket"], this["client"])

    const oldExistCl = await modelCl.byName(oldDb, oldCl)
    let oldDocus, total, operateType
    if (docIds && docIds.length > 0) {
      oldDocus = await modelDoc.getDocumentByIds(oldExistCl, docIds, {})
      if (oldDocus[0] === false) return [false, oldDocus[1]]
      oldDocus = oldDocus[1]
      total = docIds.length
      operateType = `批量（按选中）迁移`
    } else {
      let query = {}
      let cl = this["docHelper"].findSysColl(oldExistCl)
      if (_.toUpper(filter) !== 'ALL') {
        query = modelDoc.assembleQuery(filter)
        operateType = `批量（按筛选）迁移`
      } else {
        operateType = `批量（按全部）迁移`
      }
      oldDocus = await cl.find(query).limit(parseInt(execNum)).toArray()
      total = await cl.find(query).count()
    }

    let rst = await this["docHelper"].cutDocs(oldDb, oldCl, newDb, newCl, oldDocus)
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

    // 记录日志
    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
      let info = rst.logInfo
      await modelDoc.dataActionLog(
        info.newDocs,
        operateType,
        info.oldDbName,
        info.oldClName,
        info.newDbName,
        info.newClName,
        oldDocus
      )
    }

    return new ResultData(data)
  }
}

export default Document
