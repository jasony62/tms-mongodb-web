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
// 同步接口地址
const { httpApiUrl } = require("../config/plugins")
const HTTP_SYNCTOWORKLAYER_URL = httpApiUrl.syncToWorkLayer.syncOrder
const myURL = new URL(HTTP_SYNCTOWORKLAYER_URL)

class SyncToWorkLayer extends Base {
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
    if (!dbObj || !dbObj.schema || !dbObj.schema.body) return new ResultFault("指定文件没有集合列定义")
    if (!dbObj.extensionInfo) return new ResultFault("指定文件没有扩展属性")
    let pro_type
    if (typeof dbObj.extensionInfo.info.pro_type3 !== "undefined") {
      pro_type = 3 // 工作号
    } else if (typeof dbObj.extensionInfo.info.pro_type1 !== "undefined") {
      pro_type = 1 // 云录音
    }
    if (!pro_type) return new ResultFault("文件扩展属性中没有指定产品类型，请联系管理员")

    let dbSchema = dbObj.schema.body.properties
    if (!dbSchema || !dbSchema.sync_time || !dbSchema.sync_status) return new ResultFault("集合未指定集合列或不存在同步时间(sync_time)或同步状态(sync_status)列")
    if (!dbSchema.tel || !dbSchema.area_code || !dbSchema.province || !dbSchema.city) return new ResultFault("缺少同步必须列（tel 或 area_code 或 province 或 city）")
    // 获取要同步的数据 同步时间为空或者 有同步时间但修改时间大于同步时间
    let find = {
      $or: [
        {
          sync_time: { $in: [null, ""] },
          sync_status: { $in: [null, ""] }
        },
        {
          sync_time: { $not: { $in: [null, ""] } },
          TMS_DEFAULT_UPDATE_TIME: { $not: { $in: [null, ""] } },
          $where: "this.TMS_DEFAULT_UPDATE_TIME > this.sync_time"
        }
      ]
    }
    let operate_type
    if (filter) {
      if (_.toUpper(filter) !== "ALL") {
        if (filter.sync_time) delete filter.sync_time
        if (filter.sync_status) delete filter.sync_status
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

    let rst
    if (pro_type === 3) { // 工作号
      rst = await this._syncGZH2(tels, dbObj.extensionInfo.info, colle, {db: existDb.name, cl, operate_type})
    } else if (pro_type === 1) {
      rst = await this._syncYLY2(tels, dbObj.extensionInfo.info, colle, {db: existDb.name, cl, operate_type})
    }
    if (rst[0] === false) {
      return new ResultFault(rst[1])
    }
    rst = rst[1]
    // 
    planTotal = parseInt(planTotal)
    if (planTotal == 0) planTotal = parseInt(total) // 计划总需要同步数
    alreadySyncTotal = parseInt(alreadySyncTotal) + tels.length // 已经同步数
    alreadySyncPassTotal = rst.passTotal + parseInt(alreadySyncPassTotal) // 已经成功迁移数
    let alreadySyncFailTotal = alreadySyncTotal - alreadySyncPassTotal // 已经迁移失败的数量
    let spareTotal = await colle.find(find).count() // 剩余数量

    return new ResultData({ planTotal, alreadySyncTotal, alreadySyncPassTotal, alreadySyncFailTotal, spareTotal })
  }
  /**
   * 格式化money
   */
  _formatMoney(oMoney, field, level = "", proType = "3") {
    if (typeof oMoney === "undefined" || oMoney === "" || oMoney === null) return [false, field + '不能为空']
    if (isNaN(oMoney)) return [false, field + '不是数字']

    let newMoney = String(oMoney)
    let newMoneyArr = newMoney.split('.')
    if (newMoneyArr.length > 2) return [false, field + '格式错误']
    if (newMoneyArr.length === 1) {
      newMoney = newMoney + '.00'
    } else {
      let yushu = newMoneyArr[1]
      if (yushu.length > 3) return [false, field + '格式错误小数点后不能大于3位']
      if (yushu.length === 3) {
        newMoney = String(Number(newMoney))
        let newMoneyArr2 = newMoney.split('.')
        if (newMoneyArr2.length === 1) {
          newMoney = newMoney + '.00'
        } else if (newMoneyArr2[1].length === 1) {
          newMoney = newMoney + '0'
        } else if (newMoneyArr2[1].length === 3) {
          if (!["costCall", "money"].includes(field)) return [false, field + '格式错误小数点后不能大于2位']
        }
      } else if (yushu.length === 1) {
        newMoney = newMoney + "0"
      }
    }
    // 判断大小
    let newMoney2 = Number(newMoney)
    if (field === "cost_month" && (newMoney2 > 20 || newMoney2 < 0)) return [false, '月租费不能大于20或小于0']
    if (field === "cost_call" && (newMoney2 > 0.06 || newMoney2 < 0)) return [false, '通话费不能大于0.06或小于0']
    if (field === "cost_msg" && (newMoney2 > 0.1 || newMoney2 < 0)) return [false, '短信费不能大于0.1或小于0']
    if (field === "money" && proType === "3") {
      if (level === '1' && (newMoney2 > 12 || newMoney2 < 0)) return [false, level + '档录音费不能大于12或小于0']
      if (level === '2' && (newMoney2 > 50 || newMoney2 < 0)) return [false, level + '档录音费不能大于50或小于0']
      if (level === '3' && (newMoney2 > 180 || newMoney2 < 0)) return [false, level + '档录音费不能大于180或小于0']
      if (level === '4' && (newMoney2 > 350 || newMoney2 < 0)) return [false, level + '档录音费不能大于350或小于0']
    } else if (field === "money" && proType === "1") {
      if (level === '1' && (newMoney2 > 12 || newMoney2 < 0)) return [false, level + '档录音费不能大于12或小于0']
      if (level === '2' && (newMoney2 > 35 || newMoney2 < 0)) return [false, level + '档录音费不能大于35或小于0']
      if (level === '3' && (newMoney2 > 50 || newMoney2 < 0)) return [false, level + '档录音费不能大于50或小于0']
      if (level === '4' && (newMoney2 > 95 || newMoney2 < 0)) return [false, level + '档录音费不能大于95或小于0']
      if (level === '5' && (newMoney2 > 180 || newMoney2 < 0)) return [false, level + '档录音费不能大于180或小于0']
      if (level === '6' && (newMoney2 > 350 || newMoney2 < 0)) return [false, level + '档录音费不能大于350或小于0']
      if (level === '101' && newMoney2 < 0) return [false, '录音费不能小于0']
    }

    return [true, newMoney]
  }
  /**
   *  同步工作号 (接口方式)
   */
  async _syncGZH2(tels, extensionInfo, colle, options) {
    let { cust_id, customer_id, money_a, money_b, money_c, money_d, cost_month, cost_call, cost_msg, requestUrl, msgUrl, pushUrl, orderId, orderSource, voiceUrl } = extensionInfo
    // 同步必要字段
    if (!customer_id || !cust_id) return new ResultFault("文件扩展属性中没有找到customer_id或cust_id属性，请联系管理员")
    if (!cost_month) return [false, "文件扩展属性中月租费不能为空，请联系管理员"]
    if (!cost_call) return [false, "文件扩展属性中通话费不能为空，请联系管理员"]
    if (!requestUrl) return [false, "文件扩展属性中呼叫取绑地址不能为空，请联系管理员"]
    if (!pushUrl) return [false, "文件扩展属性中话单推送地址不能为空，请联系管理员"]
    if (!orderId) return [false, "文件扩展属性中订单编号不能为空，请联系管理员"]
    if (!orderSource) return [false, "文件扩展属性中订单来源不能为空，请联系管理员"]
    // 转换订单来源
    if (!["领航", "平台", "试用", "联调"].includes(orderSource)) return [false, "文件扩展属性中订单来源格式错误，请联系管理员"]
    if (orderSource === "领航") orderSource = "1"
    if (orderSource === "平台") orderSource = "2"
    if (orderSource === "试用") orderSource = "3"
    if (orderSource === "联调") orderSource = "4"
    // 转换提示音路径
    if (voiceUrl === "是")
      voiceUrl = "/fileserver/alertvoice/yly_zs.mp3"
    else
      voiceUrl = ""

    // 获取档位与money对应关系
    let getMoneyAndLevel = (oLevel) => {
      const datas = {
        "A": { level: "1", money: money_a },
        "B": { level: "2", money: money_b },
        "C": { level: "3", money: money_c },
        "D": { level: "4", money: money_d },
      }
      if (datas[oLevel.toUpperCase()]) {
        let data = datas[oLevel.toUpperCase()]
        if (!data.money) return [false, "档位(" + oLevel + "), 对应的录音费<money>为空"]
        let newMoney = this._formatMoney(data.money, "money", data.level)
        if (newMoney[0] === false) return newMoney
        data.money = newMoney[1]
        return [true, data]
      } else {
        return [false, "档位(" + oLevel + "), 没有对应的录音费<money>"]
      }
    }
    // 月租费
    let getCost_month = this._formatMoney(cost_month, "cost_month")
    if (getCost_month[0] === false) return [false, getCost_month[1]]
    cost_month = getCost_month[1]
    // 通话费
    let getCost_call = this._formatMoney(cost_call, "cost_call")
    if (getCost_call[0] === false) return [false, getCost_call[1]]
    cost_call = getCost_call[1]
    // 短信费
    if (cost_msg) {
      let getCost_msg = this._formatMoney(cost_msg, "cost_msg")
      if (getCost_msg[0] === false) return [false, getCost_msg[1]]
      cost_msg = getCost_msg[1]
    }
    
    //  ----------------------------------------------------------------开始同步
    let abnormalTotal = 0 // 异常数
    let passTotal = 0 // 成功数
    let rst = tels.map(async tel => {
      let current = moment().format('YYYY-MM-DD HH:mm:ss')
      let insStatus = "失败："
      let levelAndMoney

      // 判断是新增还是修改，有同步时间且修改时间大于同步时间是修改 1 新增 2 修改
      let operation
      if (!tel.sync_time) {
        operation = "1"
      } else {
        operation = "2"
      }
      // 录音档位
      if (tel.level) {
        let levelAndMoney2 = getMoneyAndLevel(tel.level)
        if (levelAndMoney2[0] === false) {
          abnormalTotal++
          insStatus += levelAndMoney2[1]
          let syncTime = (operation === "1") ? "" : current
          await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { sync_time: syncTime, sync_status: insStatus } })
          return Promise.resolve({ status: false, msg: insStatus })
        }
        levelAndMoney = levelAndMoney2[1]
      } else { // 拓展属性中录音费有值时，档位需必填 money_a, money_b, money_c, money_d
        if (money_a || money_b || money_c || money_d) {
          abnormalTotal++
          insStatus += "拓展属性中录音费有值时，档位<level>需必填"
          let syncTime = (operation === "1") ? "" : current
          await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { sync_time: syncTime, sync_status: insStatus } })
          return Promise.resolve({ status: false, msg: insStatus })
        }
      }
      // 检查文档中的必要字段
      if (!tel.tel || !tel.area_code || !tel.province || !tel.city || !tel.source) {
        abnormalTotal++
        insStatus += "文档中号码<tel>或区号<area_code>或省<province>或本地网<city>为空或<source>为空"
        let syncTime = (operation === "1") ? "" : current
        await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { sync_time: syncTime, sync_status: insStatus } })
        return Promise.resolve({ status: false, msg: insStatus })
      }
      // 号码来源
      let source = (tel.source === "客户开通") ? "1" : ((tel.source === "号池导入") ? "2" : false)
      if (source === false) {
        abnormalTotal++
        insStatus += "号码未知来源<source>"
        let syncTime = (operation === "1") ? "" : current
        await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { sync_time: syncTime, sync_status: insStatus } })
        return Promise.resolve({ status: false, msg: insStatus })
      }
      // 处理同步数据
      let ctlInsData = {}
      // 操作类型
      ctlInsData.operation = operation  // 1 新增 2 修改
      ctlInsData.tel = tel.tel
      ctlInsData.areaCode = tel.area_code
      ctlInsData.province = tel.province
      ctlInsData.localNet = tel.city
      ctlInsData.status = "1" // 新增 1 退订 99
      ctlInsData.source = source 
      ctlInsData.type = "3"
      ctlInsData.telDomain = "3"
      ctlInsData.custId = cust_id
      ctlInsData.customerId = customer_id
      ctlInsData.recordOut = "Y"
      ctlInsData.recordIn = "Y"
      ctlInsData.proType = "3"
      if (levelAndMoney) { // 录音档位
        ctlInsData.levelRecord = levelAndMoney.level
        ctlInsData.money = levelAndMoney.money
      }
      ctlInsData.costCall = cost_call
      ctlInsData.costMonth = cost_month
      if (cost_msg) ctlInsData.costMsg = cost_msg
      ctlInsData.domainCode = ""
      ctlInsData.externFlag = "1"
      ctlInsData.requestUrl = requestUrl
      if (msgUrl) ctlInsData.msgUrl = msgUrl
      ctlInsData.pushUrl = pushUrl
      ctlInsData.orderId = orderId
      ctlInsData.orderSource = orderSource
      ctlInsData.voiceUrl = voiceUrl

      // 开始同步
      return new Promise(async (resolve) => {
        request({
          url: HTTP_SYNCTEL_URL,
          method: "POST",
          json: true,
          headers: {
              "Content-Type": "application/json",
              "Host": myURL.host
          },
          body: ctlInsData
        }, async function(error, response, body) {
          // logger.debug(HTTP_SYNCTEL_URL, response.request.headers, response.request.body)
          if (error) {
            logger.error("gzh", error)
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
      }).then(async rstSync => { // 修改客户表同步状态 需要等到都插入完毕以后
        let returnData
        let retrunMsg
        if (rstSync.status === true) {
          passTotal++
          retrunMsg = (operation === "1") ? "新增成功" : "修改成功"
          await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { sync_time: current, sync_status: retrunMsg } })
          returnData = { status: true, retrunMsg }
        } else {
          abnormalTotal++
          retrunMsg = rstSync.msg
          let syncTime = (operation === "1") ? "" : current
          await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { sync_time: syncTime, sync_status: retrunMsg } })
          returnData = { status: false, msg: retrunMsg }
        }

        // 记录日志
        const modelD = new modelDocu()
        tel.sync_time = current
        tel.sync_status = retrunMsg
        let {db, cl, operate_type} = options
        await modelD.dataActionLog(tel, "工作号号码同步(" + operate_type + ")", db, cl)

        return Promise.resolve(returnData)
      })
    })

    return Promise.all(rst).then(async rst3 => {
      return [true, { abnormalTotal, passTotal }]
    })
  }
  /**
   *  同步云录音 (接口方式)
   */
  async _syncYLY2(tels, extensionInfo, colle, options) {
    let { cust_id, customer_id, money_a, money_b, money_c, money_d, money_e, money_f, cost_month, cost_call, cost_msg, pushUrl, orderId, orderSource, voiceUrl, costType, duration_price } = extensionInfo
    // 同步必要字段
    if (!customer_id || !cust_id) return new ResultFault("文件扩展属性中没有找到customer_id或cust_id属性，请联系管理员")
    if (!pushUrl) return [false, "文件扩展属性中话单推送地址不能为空，请联系管理员"]
    if (!orderId) return [false, "文件扩展属性中订单编号不能为空，请联系管理员"]
    if (!orderSource) return [false, "文件扩展属性中订单来源不能为空，请联系管理员"]
    if (!costType) return [false, "文件扩展属性中云录音计费类型不能为空，请联系管理员"]
    if (costType === "套餐计费") {
      costType = "1"
    } else if (costType === "时长计费") {
      costType = "2"
    } else {
      return [false, "云录音计费类型 <未知类型>，请联系管理员"]
    }
    // 转换订单来源
    if (!["领航", "平台", "试用", "联调"].includes(orderSource)) return [false, "文件扩展属性中订单来源格式错误，请联系管理员"]
    if (orderSource === "领航") orderSource = "1"
    if (orderSource === "平台") orderSource = "2"
    if (orderSource === "试用") orderSource = "3"
    if (orderSource === "联调") orderSource = "4"
    // 转换提示音路径
    if (voiceUrl === "是")
      voiceUrl = "/fileserver/alertvoice/yly_zs.mp3"
    else
      voiceUrl = ""

    // 获取档位与money对应关系
    let getMoneyAndLevel = (oLevel) => {
      const datas = {
        "A": { level: "1", money: money_a },
        "B": { level: "2", money: money_b },
        "C": { level: "3", money: money_c },
        "D": { level: "4", money: money_d },
        "E": { level: "5", money: money_e },
        "F": { level: "6", money: money_f },
        "DURATION_PRICE": { level: "101", money: duration_price },
      }
      if (costType === "2") {
        oLevel = "DURATION_PRICE"
      }

      if (!oLevel) {
        return [false, "录音档位<level>不能为空"]
      }

      if (datas[oLevel.toUpperCase()]) {
        let data = datas[oLevel.toUpperCase()]
        if (!data.money) return [false, "档位(" + oLevel + "), 对应的录音费<money>为空"]
        let newMoney = this._formatMoney(data.money, "money", data.level, "1")
        if (newMoney[0] === false) return newMoney
        data.money = newMoney[1]
        return [true, data]
      } else {
        return [false, "档位(" + oLevel + "), 没有对应的录音费<money>"]
      }
    }
    // 月租费
    if (cost_month) {
      let getCost_month = this._formatMoney(cost_month, "cost_month")
      if (getCost_month[0] === false) return [false, getCost_month[1]]
      cost_month = getCost_month[1]
    }
    // 通话费
    if (cost_call) {
      let getCost_call = this._formatMoney(cost_call, "cost_call")
      if (getCost_call[0] === false) return [false, getCost_call[1]]
      cost_call = getCost_call[1]
    }
    // 短信费
    if (cost_msg) {
      let getCost_msg = this._formatMoney(cost_msg, "cost_msg")
      if (getCost_msg[0] === false) return [false, getCost_msg[1]]
      cost_msg = getCost_msg[1]
    }

    // --------------------------------------------------------------------开始同步
    let abnormalTotal = 0 // 异常数
    let passTotal = 0 // 成功数
    let rst = tels.map(async tel => {
      let current = moment().format('YYYY-MM-DD HH:mm:ss')
      let insStatus = "失败："
      // 判断是新增还是修改，有同步时间且修改时间大于同步时间是修改
      let operation
      if (!tel.sync_time) {
        operation = "1"
      } else {
        operation = "2"
      }

      // 检查文档中的必要字段
      if (!tel.tel || !tel.area_code || !tel.province || !tel.city) {
        abnormalTotal++
        insStatus += "文档中号码<tel>或区号<area_code>或省<province>或本地网<city>为空"
        let syncTime = (operation === "1") ? "" : current
        await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { sync_time: syncTime, sync_status: insStatus } })
        return Promise.resolve({ status: false, msg: insStatus })
      }
      // 录音档位
      let levelAndMoney = getMoneyAndLevel(tel.level)
      if (levelAndMoney[0] === false) {
        abnormalTotal++
        insStatus += levelAndMoney[1]
        let syncTime = (operation === "1") ? "" : current
        await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { sync_time: syncTime, sync_status: insStatus } })
        return Promise.resolve({ status: false, msg: insStatus })
      }
      levelAndMoney = levelAndMoney[1]
      
      // 来源
      let status
      if (tel.status === "待签约") {
        status = "3"
      } else if (tel.status === "可使用") {
        status = "1"
      } else if (tel.status === "已删除") {
        status = "99"
      } else {
        abnormalTotal++
        insStatus += "未识别号码状态<status>"
        let syncTime = (operation === "1") ? "" : current
        await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { sync_time: syncTime, sync_status: insStatus } })
        return Promise.resolve({ status: false, msg: insStatus })
      }
      // 处理同步数据
      let ctlInsData = {}
      // 操作类型
      ctlInsData.operation = operation  // 1 新增 2 修改
      ctlInsData.tel = tel.tel
      ctlInsData.areaCode = tel.area_code
      ctlInsData.province = tel.province
      ctlInsData.localNet = tel.city
      ctlInsData.status = status // 新增 1 退订 99
      ctlInsData.source = "1" 
      ctlInsData.type = "3"
      ctlInsData.telDomain = "3"
      ctlInsData.custId = cust_id
      ctlInsData.customerId = customer_id
      ctlInsData.recordOut = "Y"
      ctlInsData.recordIn = "Y"
      ctlInsData.proType = "1"
      if (costType === "1") ctlInsData.levelRecord = levelAndMoney.level // 录音档位
      ctlInsData.money = levelAndMoney.money
      if (cost_call) ctlInsData.costCall = cost_call
      if (cost_month) ctlInsData.costMonth = cost_month
      if (cost_msg) ctlInsData.costMsg = cost_msg
      ctlInsData.domainCode = ""
      // ctlInsData.externFlag = "1"
      // if (requestUrl) ctlInsData.requestUrl = requestUrl
      // if (msgUrl) ctlInsData.msgUrl = msgUrl
      ctlInsData.pushUrl = pushUrl
      ctlInsData.orderId = orderId
      ctlInsData.orderSource = orderSource
      ctlInsData.voiceUrl = voiceUrl
      ctlInsData.costType = costType //costType

      // 开始同步
      return new Promise(async (resolve) => {
        request({
          url: HTTP_SYNCTEL_URL,
          method: "POST",
          json: true,
          headers: {
              "content-type": "application/json",
              "Host": myURL.host
          },
          body: ctlInsData
        }, async function(error, response, body) {
          // logger.debug(HTTP_SYNCTEL_URL, response.request.headers, response.request.body)
          if (error) {
            logger.error("yly", error)
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
      }).then(async rstSync => { // 修改客户表同步状态 需要等到都插入完毕以后
        let returnData
        let retrunMsg
        if (rstSync.status === true) {
          passTotal++
          retrunMsg = (operation === "1") ? "新增成功" : "修改成功"
          await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { sync_time: current, sync_status: retrunMsg } })
          returnData = { status: true, retrunMsg }
        } else {
          abnormalTotal++
          retrunMsg = rstSync.msg
          let syncTime = (operation === "1") ? "" : current
          await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { sync_time: syncTime, sync_status: retrunMsg } })
          returnData = { status: false, msg: retrunMsg }
        }
        
        // 记录日志
        const modelD = new modelDocu()
        tel.sync_time = current
        tel.sync_status = retrunMsg
        let {db, cl, operate_type} = options
        await modelD.dataActionLog(tel, "云录音号码同步(" + operate_type + ")", db, cl)

        return Promise.resolve(returnData)
      })
    })

    return Promise.all(rst).then(async rst3 => {
      return [true, { abnormalTotal, passTotal }]
    })
  }
}

module.exports = SyncToWorkLayer
