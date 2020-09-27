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
    let requireFields = ["work_sync_time", "work_sync_status", "auditing_status", "order_id", "order_name", "source", "status", "cust_id", "cust_name", "pro_type", "customer_id", "cust_account", "biz_function", "create_time", "TMS_DEFAULT_UPDATE_TIME"]
    let missFields = requireFields.filter(field => !dbSchema[field])
    if (missFields.length) return new ResultFault("缺少同步必须列(" + missFields.join(',') + ")")

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

    let rst = await this.fnSync(tels, dbSchema, colle, { db: existDb.name, cl, operate_type })
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
   *  同步 (接口方式)
   */
  async fnSync(tels, schema, colle, options) {
    let abnormalTotal = 0 // 异常数
    let passTotal = 0 // 成功数

    let rst = tels.map(async tel => {
      // 按照定义补足数据并根据类型更改数据
      Object.entries(schema).forEach(([key, value]) => {
        if (!tel[key] || !tel[key].length) {
          tel[key] = ""
          return false
        }
        if (value.type === 'array' && value.enum) {
          tel[key] = tel[key].join(',')
        }
      });
      let current = moment().format('YYYY-MM-DD HH:mm:ss')
      let insStatus = "失败："

      // 判断是新增(1)还是修改(2), 有同步时间且修改时间大于同步时间是修改
      let operation = tel.work_sync_time ? "2" : "1"

      // 检查审核状态 0:无需审核 2:等待审核 1:审核通过 99:驳回
      if (tel.auditing_status !== '1') {
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

      if (tel.source === '1') {
        if (!tel.cust_account) {
          abnormalTotal++
          insStatus += "的值为空"
          let syncTime = (operation === "1") ? "" : current
          await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: syncTime, work_sync_status: insStatus } })
          return Promise.resolve({ status: false, msg: insStatus })
        }
      }
      // 检查不同产品类型的特有必需字段是否有值
      //云录音
      if (tel.pro_type === '1') {
        let flag = false
        if (!schema.product_version || !tel.product_version) {
          insStatus += "product_version,"
          flag = true
        }
        if (!schema.num_type || !tel.num_type) {
          insStatus += "num_type,"
          flag = true
        }
        if (!schema.flag_playtips_yly || !tel.flag_playtips_yly) {
          insStatus += "flag_playtips_yly,"
          flag = true
        }
        if (!tel.biz_function) {
          insStatus += "biz_function,"
          flag = true
        }
        if (!schema.num_sum || !tel.num_sum) {
          insStatus += "num_sum,"
          flag = true
        }
        if (flag) {
          abnormalTotal++
          insStatus += "的列不存在或值为空"
          let syncTime = (operation === "1") ? "" : current
          await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: syncTime, work_sync_status: insStatus } })
          return Promise.resolve({ status: false, msg: insStatus })
        }
      }

      // 云中继
      if (tel.pro_type === '2') {
        let flag = false
        if (!schema.recyzj_flag || !tel.recyzj_flag) {
          insStatus += "recyzj_flag,"
          flag = true
        }
        if (tel.recyzj_flag === 'Y') {
          if (!schema.call_url) {
            insStatus += "call_url,"
            flag = true
          }
          if (!schema.extern_flag || !tel.extern_flag) {
            insStatus += "extern_flag,"
            flag = true
          }
          if (tel.extern_flag === '1') {
            if (!tel.call_url) {
              insStatus += "call_url,"
              flag = true
            }
          }
        }
        if (tel.recyzj_flag === 'N') {
          if (!schema.call_url_yzj) {
            insStatus += "call_url_yzj,"
            flag = true
          }
          if (!schema.extern_flag_yzj || !tel.extern_flag_yzj) {
            insStatus += "extern_flag_yzj,"
            flag = true
          }
          if (tel.extern_flag_yzj === '1') {
            if (!tel.call_url_yzj) {
              insStatus += "call_url_yzj,"
              flag = true
            }
          }
        }
        if (flag) {
          abnormalTotal++
          insStatus += "的列不存在或值为空"
          let syncTime = (operation === "1") ? "" : current
          await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: syncTime, work_sync_status: insStatus } })
          return Promise.resolve({ status: false, msg: insStatus })
        }
      }

      // 工作号
      if (tel.pro_type === '3') {
        let flag = false
        if (!schema.call_url || !tel.call_url) {
          insStatus += "call_url,"
          flag = true
        }
        if (tel.biz_function && tel.biz_function.indexOf('2') !== -1) {
          if (!schema.msg_url || !tel.msg_url) {
            insStatus += "msg_url,"
            flag = true
          }
          if (!schema.msgpush_url || !tel.msgpush_url) {
            insStatus += "msgpush_url,"
            flag = true
          }
        }
        if (tel.biz_function && tel.biz_function.indexOf('1') !== -1) {
          if (!schema.flag_playtips_gzh || !tel.flag_playtips_gzh) {
            insStatus += "flag_playtips_gzh,"
            flag = true
          }
        }
        if (!schema.extern_flag || !tel.extern_flag) {
          insStatus += "extern_flag,"
          flag = true
        }
        if (flag) {
          abnormalTotal++
          insStatus += "的列不存在或值为空"
          let syncTime = (operation === "1") ? "" : current
          await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: syncTime, work_sync_status: insStatus } })
          return Promise.resolve({ status: false, msg: insStatus })
        }
      }

      if (tel.pro_type === '3' || tel.pro_type === '1' || (tel.pro_type === '2' && tel.recyzj_flag === 'Y')) {
        let flag = false
        if (!schema.cdrpush_url || !tel.cdrpush_url) {
          insStatus += "cdrpush_url"
          flag = true
        }
        if (flag) {
          abnormalTotal++
          insStatus += "的列不存在或值为空"
          let syncTime = (operation === "1") ? "" : current
          await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: syncTime, work_sync_status: insStatus } })
          return Promise.resolve({ status: false, msg: insStatus })
        }
      }

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
        "managerTel": tel.manager_tel ? tel.manager_tel : "",
        "entpriseProvince": tel.entprise_province ? tel.entprise_province : "",
        "bizFunction": tel.biz_function,
        "proType": tel.pro_type,
        "customerId": tel.customer_id,
        "managerNetWork": tel.managerNetWork ? tel.managerNetWork : "",
        "orderTime": tel.create_time,
        "numSum": tel.num_sum
      }
      if (tel.source !== '3') {
        postData.custAccount = tel.cust_account
      }
      if (operation === '2') {
        postData.changeTime = tel.TMS_DEFAULT_UPDATE_TIME
      }
      if (tel.status === '99') {
        postData.delTime = tel.TMS_DEFAULT_UPDATE_TIME
      }

      if (tel.pro_type === '1') {
        postData.bqjVoiceUrl = tel.flag_playtips_yly === 'Y' ? "/fileserver/alertvoice/yly_zs.mp3" : ""
        postData.yzVoiceUrl = tel.flag_playtips_yly === 'Y' ? "/fileserver/ngcc/vox/yly/tone/yly_zs.mp3" : ""
        postData.productVersion = tel.product_version
        postData.numType = tel.num_type
        postData.cdrPushUrl = tel.cdrpush_url
      }

      if (tel.pro_type === '2') {
        postData.recyzjFlag = tel.recyzj_flag
        postData.costMonth = tel.discostmonth_yzj ? tel.discostmonth_yzj : tel.costmonth_yzj
        postData.costCall = tel.discostcall_yzj ? tel.discostcall_yzj : tel.costcall_yzj
        if (tel.recyzj_flag === 'Y') {
          postData.cdrPushUrl = tel.cdrpush_url
          postData.externFlag = tel.extern_flag
          if (tel.extern_flag === '1') {
            postData.requestUrl = tel.call_url
          }

        }
        if (tel.recyzj_flag === 'N') {
          postData.cdrPushUrl = tel.cdrpush_url
          postData.externFlag = tel.extern_flag_yzj
          if (tel.extern_flag === '1') {
            postData.requestUrl = tel.call_url_yzj
          }
        }
      }

      if (tel.pro_type === '3') {
        if (tel.biz_function && tel.biz_function.indexOf('1') !== -1) {
          postData.bqjVoiceUrl = tel.flag_playtips_gzh === 'Y' ? "/fileserver/alertvoice/yly_zs.mp3" : ""
        }
        if (tel.biz_function && tel.biz_function.indexOf('2') !== -1) {
          postData.msgUrl = tel.msg_url
          postData.msgPushUrl = tel.msgpush_url
        }
        postData.cdrPushUrl = tel.cdrpush_url
        postData.requestUrl = tel.call_url
        postData.externFlag = tel.extern_flag
      }

      // 开始同步
      return new Promise(async (resolve) => {
        logger.debug('开始调用业务接口')
        logger.debug('传递的数据', postData)
        request({
          url: HTTP_SYNCTOWORK_URL,
          method: "POST",
          json: true,
          headers: {
            "Content-Type": "application/json",
            "Host": myURL.host
          },
          body: postData
        }, async function (error, response, body) {
          logger.debug('业务层返回的内容', body)
          let type = tel.pro_type === '1' ? 'yly' : (tel.pro_type === '2' ? 'yzj' : 'gzh')
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
        type = tel.pro_type === '1' ? '云录音' : (tel.pro_type === '2' ? '云中继' : '工作号')
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
        let { db, cl, operate_type } = options
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
