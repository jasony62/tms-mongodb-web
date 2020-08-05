const modelDocu = require('../models/mgdb/document')
const moment = require('moment')
const request = require('request')
const ObjectId = require('mongodb').ObjectId
const log4js = require('log4js')
const logger = log4js.getLogger('mongodb-web-syncToWorkLayer')


/**
 * 处理http请求的接口
 */
const { httpApiUrl } = require("../config/plugins")
const HTTP_SYNCTOWORK_URL = httpApiUrl.syncToWork.syncOrder
const myURL = new URL(HTTP_SYNCTOWORK_URL)

/**
 *  同步 (接口方式)
 */
async function fnSyncWork(tels, schema, colle, options) {
	// 校验必须列
	let requireFields = ["work_sync_time", "work_sync_status", "auditing_status", "order_id", "order_name", "source", "status", "cust_id", "cust_name", "pro_type", "customer_id"]
	let missFields = requireFields.filter(field => !schema[field])
	if (missFields.length) {
		let msg = "缺少同步必须列(" + missFields.join(',') + ")"
		logger.debug(msg)
		return [false, msg]
	}

	let abnormalTotal = 0 // 异常数
	let passTotal = 0 // 成功数

	let rst = tels.map(async tel => {
		// 按照定义补足数据并根据类型更改数据
		Object.entries(schema).forEach(([key, value]) => {
			if (!tel[key] || !tel[key].length) {
				tel[key] = ""
				return false
			}
			if (value.type === 'array' && value.enum && Array.isArray(tel[key])) {
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
		let ghzFields = ["order_id", "order_name", "source", "status", "cust_id", "cust_name", "pro_type", "customer_id", "cdrpush_url"]
		let errorFields = ghzFields.filter(field => !tel[field])
		if (errorFields.length) {
			abnormalTotal++
			insStatus += errorFields.join(',') + "的值为空"
			let syncTime = operation === "1" ? "" : current
			await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: syncTime, work_sync_status: insStatus } })
			return Promise.resolve({ status: false, msg: insStatus })
		}

		// 检查不同产品类型的特有必需字段是否有值-云录音
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
			if (!schema.flag_playtips || !tel.flag_playtips) {
				insStatus += "flag_playtips,"
				flag = true
			}
			if (!schema.biz_function || !tel.biz_function) {
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
		let vals = ['1', '1,2', '1,3', '1,2,3', '2', '2,3', '3']
		if (tel.pro_type === '1' && !vals.includes(tel.num_type)) {
			abnormalTotal++
			insStatus += "num_type的值只能是1或1,2或2或2,3或3"
			let syncTime = (operation === "1") ? "" : current
			await colle.updateOne({ _id: ObjectId(tel._id) }, { $set: { work_sync_time: syncTime, work_sync_status: insStatus } })
			return Promise.resolve({ status: false, msg: insStatus })
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
			}
			if (tel.biz_function && tel.biz_function.indexOf('1') !== -1) {
				if (!schema.flag_playtips || !tel.flag_playtips) {
					insStatus += "flag_playtips,"
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

		if (tel.pro_type === '3' || tel.pro_type === '1') {
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

		// voiceUrl
		let voiceUrl = tel.flag_playtips === 'Y' ? "/fileserver/alertvoice/yly_zs.mp3" : ""

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
		}
		if (tel.pro_type === '1') {
			postData.voiceUrl = voiceUrl
			postData.productVersion = tel.product_version
			postData.numType = tel.num_type
			postData.recordpushUrl = tel.recordpush_url ? tel.recordpush_url : ""
			postData.cdrpushUrl = tel.cdrpush_url
			postData.numSum = tel.num_sum

		}
		if (tel.pro_type === '3') {
			if (tel.biz_function && tel.biz_function.indexOf('1') !== -1) {
				postData.voiceUrl = voiceUrl
			}
			postData.recordpushUrl = tel.recordpush_url ? tel.recordpush_url : ""
			postData.cdrpushUrl = tel.cdrpush_url
			postData.requestUrl = tel.call_url
			if (tel.biz_function && tel.biz_function.indexOf('2') !== -1) {
				postData.msgUrl = tel.msg_url
			}
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

module.exports = fnSyncWork