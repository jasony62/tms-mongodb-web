const { ResultData, ResultFault } = require('tms-koa')
const Base = require('./base')
const MODELCOLL = require('../models/mgdb/collection')
const ObjectId = require('mongodb').ObjectId
const _ = require('lodash')
const DocumentHelper = require('../controllers/documentHelper')
const fnSync = require('./fnSyncWork')

class SyncToWork extends Base {
  constructor(...args) {
    super(...args)
    this.docHelper = new DocumentHelper(this)
  }
  /**
   * @execNum 本次最大迁移数
   * @planTotal 总计划迁移数
   * @alreadySyncTotal 已经迁移的个数
   * @alreadySyncPassTotal 已经迁移成功的个数
   */
  async syncOrder() {
    let { db, cl, execNum = 200, planTotal = 0, alreadySyncTotal = 0, alreadySyncPassTotal = 0 } = this.request.query
    if (!db || !cl || !execNum) return new ResultFault("参数不完整")

    let { docIds, filter } = this.request.body
    if (!filter && (!docIds || !Array.isArray(docIds) || docIds.length == 0)) {
      return new ResultFault("没有要同步的数据")
    }

    const existDb = await this.docHelper.findRequestDb()
    let client = this.mongoClient
    let colle = client.db(existDb.sysname).collection(cl)
    // 获取指定集合
    let dbObj = await MODELCOLL.getCollection(existDb, cl)
    if (!dbObj || !dbObj.schema || !dbObj.schema.body || !dbObj.schema.body.properties) return new ResultFault("指定文件没有集合列定义")
    let dbSchema = dbObj.schema.body.properties

    // 获取要同步的数据 同步时间为空或者有同步时间但修改时间大于同步时间
    let find = {
      $or: [
        {
          work_sync_time: { $in: [null, ""] },
          work_sync_status: { $in: [null, ""] }
        },
        {
          work_sync_time: { $not: { $in: [null, ""] } },
          TMS_DEFAULT_UPDATE_TIME: { $not: { $in: [null, ""] } },
          $where: "this.TMS_DEFAULT_UPDATE_TIME > this.work_sync_time"
        }
      ]
    }
    let operate_type
    if (filter) {
      if (_.toUpper(filter) !== "ALL") {
        if (filter.work_sync_time) delete filter.work_sync_time
        if (filter.work_sync_status) delete filter.work_sync_status
        let find2 = this._assembleFind(filter)
        Object.assign(find, find2)
        operate_type = "按筛选"
      } else {
        operate_type = "按全部"
      }
    } else {
      let docIds2 = []
      docIds.forEach(id => {
        docIds2.push(new ObjectId(id))
      })
      find._id = { $in: docIds2 }
      operate_type = "按选中"
    }

    // 需要同步的数据的总数
    let total = await colle.find(find).count()
    if (total === 0) return new ResultFault("没有要同步的数据")
    // 分批次插入, 一次默认插入200条
    let tels = await colle.find(find).limit(parseInt(execNum)).toArray()

    let rst = await fnSync(tels, dbSchema, colle, { db: existDb.name, cl, operate_type })
    if (rst[0] === false) {
      return new ResultFault(rst[1])
    }
    rst = rst[1]

    planTotal = parseInt(planTotal)
    if (planTotal == 0) planTotal = parseInt(total) // 计划总需要同步数
    alreadySyncTotal = parseInt(alreadySyncTotal) + tels.length // 已经同步数
    alreadySyncPassTotal = rst.passTotal + parseInt(alreadySyncPassTotal) // 已经成功迁移数
    let alreadySyncFailTotal = alreadySyncTotal - alreadySyncPassTotal // 已经迁移失败的数量
    let spareTotal = await colle.find(find).count() // 剩余数量

    return new ResultData({ planTotal, alreadySyncTotal, alreadySyncPassTotal, alreadySyncFailTotal, spareTotal })
  }
}

module.exports = SyncToWork
