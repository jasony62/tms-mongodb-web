const { ResultData, ResultFault } = require('tms-koa')
const Base = require('./base')
const modelDocu = require('../models/mgdb/document')
const MODELCOLL = require('../models/mgdb/collection')
const moment = require('moment')
const ObjectId = require('mongodb').ObjectId
const _ = require('lodash')
const log4js = require('log4js')
const logger = log4js.getLogger('mongodb-web-syncToWorkLayer')
const request = require('request')
const DocumentHelper = require('../controllers/documentHelper')

/**
 * 处理http请求的接口
 */
const { httpApiUrl } = require("../config/plugins")
const HTTP_SYNCTOWORK_URL = httpApiUrl.syncToWork.syncOrder
const myURL = new URL(HTTP_SYNCTOWORK_URL)

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
		// 校验必须列
		let dbSchema = dbObj.schema.body.properties
		let requireFields = ["work_sync_time", "work_sync_status", "auditing_status", "order_id", "order_name", "source", "status", "cust_id", "cust_name", "pro_type", "customer_id"]
		let missFields = requireFields.filter(field => !dbSchema[field])
		if (missFields.length) return new ResultFault("缺少同步必须列("+ missFields.join(',') +")")

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

    let rst = await this.fnSync(tels, dbSchema, colle, {db: existDb.name, cl, operate_type})
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
  /**
   *  同步工作号 (接口方式)
   */
  async fnSync(tels, schema, colle, options) {
    let abnormalTotal = 0 // 异常数
		let passTotal = 0 // 成功数
		
    let rst = tels.map(async tel => {
      let current = moment().format('YYYY-MM-DD HH:mm:ss')
			let insStatus = "失败："
			
      // 判断是新增(1)还是修改(2), 有同步时间且修改时间大于同步时间是修改
			let operation = tel.work_sync_time ? "2" : "1"

			// 检查审核状态 0:无需审核 2:等待审核 1:审核通过 99:驳回
			if (tel.auditing_status!=='1') {
				abnormalTotal++
        insStatus += "此订单未通过审核"
        let syncTime = (operation === "1") ? "" : current
        await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: syncTime, work_sync_status: insStatus } })
        return Promise.resolve({ status: false, msg: insStatus })
			}

			// 检查同步时必要字段的值
			let ghzFields = ["order_id", "order_name", "source", "status", "cust_id", "cust_name", "pro_type", "customer_id"]
			let errorFields = ghzFields.filter(field => !tel[field])
      if (errorFields.length) {
				abnormalTotal++
        insStatus += errorFields.join(',') + "的值为空"
        let syncTime = operation === "1" ? "" : current
        await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: syncTime, work_sync_status: insStatus } })
        return Promise.resolve({ status: false, msg: insStatus })
			}
			
			// 检查不同产品类型的特有必需字段是否有值
			if (tel.pro_type==='1' && (!schema.product_version || !schema.num_type) && (!tel.product_version || !tel.num_type)) {
				abnormalTotal++
        insStatus += "product_version或num_type的列不存在或值为空"
        let syncTime = (operation === "1") ? "" : current
        await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: syncTime, work_sync_status: insStatus } })
        return Promise.resolve({ status: false, msg: insStatus })
			}

			if (tel.pro_type==='3' && !schema.call_url && !tel.call_url) { 
				abnormalTotal++
        insStatus += "call_url的列不存在或值为空"
        let syncTime = (operation === "1") ? "" : current
        await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: syncTime, work_sync_status: insStatus } })
        return Promise.resolve({ status: false, msg: insStatus })
			}

			if (tel.pro_type==='3' && tel.biz_function && tel.biz_function.indexOf('2')!==-1 ) {
				if (!schema.msg_url || !tel.msg_url) {
					abnormalTotal++
					insStatus += "msg_url的列不存在或值为空"
					let syncTime = (operation === "1") ? "" : current
					await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: syncTime, work_sync_status: insStatus } })
					return Promise.resolve({ status: false, msg: insStatus })
				}
			}

			// voiceUrl
			let voiceUrl = tel.flag_playtips==='Y' ? "/fileserver/alertvoice/yly_zs.mp3" : ""

			// 准备数据
			let postData = {
				"orderId": tel.order_id, 
				"operation": operation,
				"orderName": tel.order_name, 
				"source": tel.source, 
				"status": tel.status, 
				"custId": tel.cust_id, 
				"custName": tel.cust_name, 
				"managerName": tel.manager_name ? tel.manager_name : "", 
				"managerAccount": tel.account ? tel.account : "", 
				"custAccount": tel.cust_account ? tel.cust_account : "", 
				"managerTel": tel.manager_tel ? tel.manager_tel : "", 
				"entpriseProvince": tel.entprise_province ? tel.entprise_province : "", 
				"bizFunction": tel.biz_function, 
				"proType": tel.pro_type, 
				"customerId": tel.customer_id, 
				"managerNetWork": tel.managerNetWork ? tel.managerNetWork : "", 
				"numSum": tel.num_sum ? tel.num_sum : ""
			}
			if (tel.pro_type==='1') {
				postData.voiceUrl = voiceUrl
				postData.productVersion = tel.product_version
				postData.numType = tel.num_type
				postData.recordpushUrl = tel.recordpush_url ? tel.recordpush_url : ""
				postData.cdrpushUrl = tel.cdrpush_url ? tel.cdrpush_url : ""

			}
			if (tel.pro_type==='3') {
				if(tel.biz_function && tel.biz_function.indexOf('1')!==-1) {
					postData.voiceUrl = voiceUrl
				}
				postData.recordpushUrl = tel.recordpush_url ? tel.recordpush_url : ""
				postData.cdrpushUrl = tel.cdrpush_url ? tel.cdrpush_url : ""
				postData.requestUrl = tel.call_url
				if(tel.biz_function && tel.biz_function.indexOf('2')!==-1) {
					postData.msgUrl = tel.msg_url
				}
			}
			
			// 开始同步
      return new Promise(async (resolve) => {
				logger.debug('开始调用业务接口')
				logger.debug('传递的数据',postData)
        request({
          url: HTTP_SYNCTOWORK_URL,
          method: "POST",
          json: true,
          headers: {
              "Content-Type": "application/json",
              "Host": myURL.host
          },
          body: postData
        }, async function(error, response, body) {
					logger.debug('业务层返回的内容', body)
					let type = tel.pro_type==='1' ? 'yly' : (tel.pro_type==='2' ? 'yzj' : 'gzh')
          if (error) {
            logger.error(type, error)
            insStatus += "接口发送失败; "
            return resolve({ status: false, msg: insStatus })
          }
          if (!body) {
            insStatus += "body为空; "
            return resolve({ status: false, msg: insStatus })
          } else if (typeof body === 'string') {
              try {
                body = JSON.parse(body)
              } catch (error) {
                insStatus += ("返回解析失败：" + body)
                return resolve({ status: false, msg: insStatus })
              }
          }
          if (body.returnCode != "0") {
            insStatus += ("msg: " + body.msg)
            return resolve({ status: false, msg: insStatus })
          }
          return resolve({ status: true, msg: "成功" })
        })
      }).then(async rstSync => { 
				// 修改客户表同步状态 需要等到都插入完毕以后
				let returnData, returnMsg, type
				type = tel.pro_type==='1' ? '云录音' : (tel.pro_type==='2' ? '云中继' : '工作号')
        if (rstSync.status === true) {
          passTotal++
          returnMsg = operation === "1" ? "新增成功" : "修改成功"
          await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: current, work_sync_status: returnMsg } })
          returnData = { status: true, returnMsg }
        } else {
          abnormalTotal++
          returnMsg = rstSync.msg
          let syncTime = operation === "1" ? "" : current
          await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: syncTime, work_sync_status: returnMsg } })
          returnData = { status: false, msg: returnMsg }
        }

        // 记录日志
        const modelD = new modelDocu()
        tel.work_sync_time = current
        tel.work_sync_status = returnMsg
        let {db, cl, operate_type} = options
        await modelD.dataActionLog(tel, type + "订单同步(" + operate_type + ")", db, cl)

        return Promise.resolve(returnData)
      })
    })

    return Promise.all(rst).then(async () => {
      return [true, { abnormalTotal, passTotal }]
    })
  }
}

module.exports = SyncToWork
