import { ResultData, ResultFault, Context } from 'tms-koa'
const { FsContext } = Context
import { UploadPlain } from 'tms-koa/dist/model/fs/upload.js'
import { LocalFS } from 'tms-koa/dist/model/fs/local.js'
import DocBase from '../documentBase.js'
import _ from 'lodash'
import { ModelCl, ModelDoc } from 'tmw-kit'
import mongodb from 'mongodb'
const ObjectId = mongodb.ObjectId
import DbHelper from '../dbHelper.js'
import CollectionHelper from '../collectionHelper.js'

class Document extends DocBase {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
  /**
   * 上传并导入单个文件
   */
  async uploadToImport() {
    if (!this.request.files || !this.request.files.file) {
      return new ResultFault('没有上传文件')
    }

    let { reqMode, docCreateMode } = this.request.query
    if (reqMode === 'api') await this.beforeImport()

    const existCl = await this.docHelper.findRequestCl()
    if (reqMode === 'api') {
      /**检查集合中是否已经存在数据*/
      const docCl = await this.docHelper.findSysColl(existCl)
      const total = await docCl.countDocuments()
      if (total > 0) {
        switch (docCreateMode) {
          case 'stop':
            console.log(`停止新建文档`)
            const docInfo: any = {}
            if (this.bucketObj) docInfo.bucket = this.bucketObj.name
            const docs = await docCl.find(docInfo).toArray()
            return new ResultData(docs)
          case 'override':
            console.log(`清除已有文档`)
            await docCl.deleteMany({})
            break
          case 'merge':
            console.log(`添加新文档`)
            break
        }
      }
    }

    const file = this.request.files.file
    const fsContextIns = FsContext.insSync()
    const domain = fsContextIns.getDomain(fsContextIns.defaultDomain)
    const tmsFs = new LocalFS(Context, domain)
    const upload = new UploadPlain(tmsFs)
    let filepath
    try {
      filepath = await upload.store(file, '', 'Y')
    } catch (e) {
      return new ResultFault(e.message)
    }

    let rst = await this.docHelper.importToColl(
      existCl,
      filepath,
      null,
      reqMode
    )

    let result = null
    if (rst[0] === true) {
      if (reqMode === 'api') {
        result = rst[1]
      } else {
        result = {
          importAll: true,
          message: `导入成功`,
        }
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
    } = this['request'].query

    let { docIds, filter } = this['request'].body

    if (!filter && (!Array.isArray(docIds) || docIds.length == 0)) {
      return new ResultFault('没有要移动的数据')
    }

    let modelCl = new ModelCl(this.mongoClient, this.bucket, this.client)
    let modelDoc = new ModelDoc(this.mongoClient, this.bucket, this.client)

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
      let cl = this['docHelper'].findSysColl(oldExistCl)
      if (_.toUpper(filter) !== 'ALL') {
        query = modelDoc.assembleQuery(filter)
        operateType = `批量（按筛选）迁移`
      } else {
        operateType = `批量（按全部）迁移`
      }
      oldDocus = await cl.find(query).limit(parseInt(execNum)).toArray()
      total = await cl.countDocuments(query)
    }

    let rst = await this['docHelper'].cutDocs(
      oldDb,
      oldCl,
      newDb,
      newCl,
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

    // 记录日志
    if (this.tmwConfig.TMW_APP_DATA_ACTION_LOG === 'Y') {
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
  /**
   * 处理db/cl
   * 针对上游直接请求【uploadToImport】API
   */
  async beforeImport() {
    let { originalFilename: fileName } = this.request.files.file
    fileName = fileName.substring(0, fileName.indexOf('.'))
    if (new RegExp('^[a-zA-Z]+[0-9a-zA-Z_]{0,63}$').test(fileName) !== true) {
      fileName = 'excel'
    }

    let { db, cl } = this.request.query
    if (!db) {
      db = 'upload_import'
      this.request.query.db = db
    }
    if (!cl) {
      const dayjs = (await import('dayjs')).default
      cl = fileName + dayjs().format('YYYYMMDDHHmmss')
      this.request.query.cl = cl
    }

    const dbInfo: any = { name: db }
    if (this.bucketObj) dbInfo.bucket = this.bucketObj.name
    const dbHelper = new DbHelper(this)
    let [dbFlag, dbRst] = await dbHelper.dbCreate(dbInfo)
    console.log('db flag -- ', dbFlag, dbRst)

    const clInfo: any = { name: cl }
    if (this.bucketObj) clInfo.bucket = this.bucketObj.name
    const clHelper = new CollectionHelper(this)
    const reqDb = await clHelper.findRequestDb()
    let [clFlag, clRst] = await clHelper.createCl(reqDb, clInfo)
    console.log('cl flag -- ', clFlag, clRst)

    return true
  }
}

export default Document
