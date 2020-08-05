const modelDocu = require('../models/mgdb/document')
const moment = require('moment')
const request = require('request')
const ObjectId = require('mongodb').ObjectId
const log4js = require('log4js')
const logger = log4js.getLogger('mongodb-web-syncToPool')

/**
 * 处理http请求的接口
 */
const { httpApiUrl } = require("../config/plugins")
const HTTP_SYNCTOPOOL_URL = httpApiUrl.syncToPool.syncOrder
const myURL = new URL(HTTP_SYNCTOPOOL_URL)

/**
   *  同步 (接口方式)
   *  @orders 待同步的数据
   *  @schema 集合列定义
   *  @colle 当前集合
   *  @options 请求参数
   */
async function fnSync(orders, schema, colle, options) {
	// 校验必须列
	let requireFields = ["pool_sync_time", "pool_sync_status", "auditing_status", "cust_id", "cust_name", "order_id", "source", "order_name", "customer_id", "pro_type", "cdrpush_url", "discost_month_gzh", "discost_call_gzh", "call_url", "flag_playtips"]
	let missFields = requireFields.filter(field => !schema[field])
	if (missFields.length) {
		let msg = "缺少同步必须列(" + missFields.join(',') + ")"
		logger.debug(msg)
		return [false, msg]
	}

	let abnormalTotal = 0 // 异常数
	let passTotal = 0 // 成功数
	let rst = orders.map(async order => {
		// 按照定义补足数据并根据类型更改数据
		Object.entries(schema).forEach(([key, value]) => {
			if (!order[key] || !order[key].length) {
				order[key] = ""
				return false
			}
			if (value.type === 'array' && value.enum && Array.isArray(order[key])) {
				order[key] = order[key].join(',')
			}
		});
		//console.log(order)
		let current, insStatus, postData
		current = moment().format('YYYY-MM-DD HH:mm:ss')
		insStatus = "失败："

		// 判断是新增(1)还是修改(2), 有同步时间且修改时间大于同步时间是修改
		let operation = order.pool_sync_time ? "2" : "1"

		// 检查审核状态 0:无需审核 2:等待审核 1:审核通过 99:驳回
		if (order.auditing_status !== '1') {
			abnormalTotal++
			insStatus += "此订单未通过审核"
			let syncTime = (operation === "1") ? "" : current
			await colle.updateOne({ _id: ObjectId(order._id) }, { $set: { pool_sync_time: syncTime, pool_sync_status: insStatus } })
			return Promise.resolve({ status: false, msg: insStatus })
		}

		// 工作号
		if (order.pro_type === '3') {
			// 检查同步时必要字段的值
			let ghzFields = ["cust_id", "cust_name", "order_id", "source", "order_name", "customer_id", "pro_type", "call_url", "cdrpush_url"]
			let errorFields = ghzFields.filter(field => !order[field])
			if (errorFields.length) {
				abnormalTotal++
				insStatus += errorFields.join(',') + "的值为空"
				let syncTime = (operation === "1") ? "" : current
				await colle.updateOne({ _id: ObjectId(order._id) }, { $set: { pool_sync_time: syncTime, pool_sync_status: insStatus } })
				return Promise.resolve({ status: false, msg: insStatus })
			}
			// 检查字段
			if (order.biz_function && (order.biz_function === '1' || order.biz_function === '1,2')) {
				let flag = false
				if (!schema.costtype_gzh || !order.costtype_gzh) {
					insStatus += "costtype_gzh,"
					flag = true
				}
				if (!order.flag_playtips) {
					insStatus += "flag_playtips,"
					flag = true
				}
				if (!schema.recordMode_gzh || !order.recordMode_gzh) {
					insStatus += "recordMode_gzh,"
					flag = true
				}
				if (flag) {
					abnormalTotal++
					insStatus += "的列不存在或值为空"
					let syncTime = (operation === "1") ? "" : current
					await colle.updateOne({ _id: ObjectId(order._id) }, { $set: { pool_sync_time: syncTime, pool_sync_status: insStatus } })
					return Promise.resolve({ status: false, msg: insStatus })
				}
			}
			if (order.biz_function && (order.biz_function === '2' || order.biz_function === '1,2')) {
				let flag = false
				if (!schema.msg_url || !order.msg_url) {
					insStatus += "msg_url列不存在或值为空"
					flag = true
				}
				if (flag) {
					abnormalTotal++
					let syncTime = (operation === "1") ? "" : current
					await colle.updateOne({ _id: ObjectId(order._id) }, { $set: { pool_sync_time: syncTime, pool_sync_status: insStatus } })
					return Promise.resolve({ status: false, msg: insStatus })
				}
			}
			// 准备数据
			postData = {
				"cust_id": order.cust_id,
				"cust_name": order.cust_name,
				"operation": operation,
				"orderId": order.order_id,
				"orderSource": order.source,
				"order_name": order.order_name,
				"customer_id": order.customer_id,
				"pro_type": order.pro_type,
				"requestUrl": order.call_url,
				"pushUrl": order.cdrpush_url,
				"cost_month": order.discost_month_gzh ? order.discost_month_gzh : order.cost_month_gzh,
				"cost_call": order.discost_call_gzh ? order.discost_call_gzh : order.cost_call_gzh
			}
			if (order.biz_function) {
				postData.bizFunction = order.biz_function
				if (order.biz_function === '1' || order.biz_function === '1,2') {
					postData.costType = order.costtype_gzh
					postData.voiceUrl = order.flag_playtips === 'Y' ? '1' : '2'
					postData.money_a = order.dismoney_a_gzh ? order.dismoney_a_gzh : order.money_a_gzh
					postData.money_b = order.dismoney_b_gzh ? order.dismoney_b_gzh : order.money_b_gzh
					postData.money_c = order.dismoney_c_gzh ? order.dismoney_c_gzh : order.money_c_gzh
					postData.money_d = order.dismoney_d_gzh ? order.dismoney_d_gzh : order.money_d_gzh
					postData.money_e = order.dismoney_e_gzh ? order.dismoney_e_gzh : order.money_e_gzh
					postData.money_f = order.dismoney_f_gzh ? order.dismoney_f_gzh : order.money_f_gzh
					postData.duration_price = order.dismoney_time_gzh ? order.dismoney_time_gzh : order.money_time_gzh
					postData.money_ex = order.disovermoney_gzh ? order.disovermoney_gzh : order.overmoney_gzh
					postData.recordMode = order.recordMode_gzh ? order.recordMode_gzh : ""
				}
				if (order.biz_function === '2' || order.biz_function === '1,2') {
					postData.msgUrl = order.msg_url
					postData.cost_msg = order.discost_msg_gzh ? order.discost_msg_gzh : order.cost_msg_gzh
				}
			}
		}

		// 云录音
		if (order.pro_type === '1') {
			// 检查同步时必要字段的值
			let ylyFields = ["cust_id", "cust_name", "order_id", "source", "order_name", "customer_id", "pro_type", "cdrpush_url", "flag_playtips", "costtype_yly"]
			let errorFields = ylyFields.filter(field => !order[field])
			if (errorFields.length) {
				abnormalTotal++
				insStatus += errorFields.join(',') + "的值为空"
				let syncTime = (operation === "1") ? "" : current
				await colle.updateOne({ _id: ObjectId(order._id) }, { $set: { pool_sync_time: syncTime, pool_sync_status: insStatus } })
				return Promise.resolve({ status: false, msg: insStatus })
			}
			// 检查字段
			if (!schema.biz_function || !order.biz_function) {
				insStatus += "biz_function列不存在或值为空"
				abnormalTotal++
				let syncTime = (operation === "1") ? "" : current
				await colle.updateOne({ _id: ObjectId(order._id) }, { $set: { pool_sync_time: syncTime, pool_sync_status: insStatus } })
				return Promise.resolve({ status: false, msg: insStatus })
			}
			if (!schema.recordMode_yly || !order.recordMode_yly) {
				insStatus += "recordMode_yly列不存在或值为空"
				abnormalTotal++
				let syncTime = (operation === "1") ? "" : current
				await colle.updateOne({ _id: ObjectId(order._id) }, { $set: { pool_sync_time: syncTime, pool_sync_status: insStatus } })
				return Promise.resolve({ status: false, msg: insStatus })
			}
			// 准备数据
			postData = {
				"cust_id": order.cust_id,
				"cust_name": order.cust_name,
				"operation": operation,
				"orderId": order.order_id,
				"orderSource": order.source,
				"order_name": order.order_name,
				"customer_id": order.customer_id,
				"pro_type": order.pro_type,
				"pushUrl": order.cdrpush_url,
				"voiceUrl": order.flag_playtips === 'Y' ? '1' : '2',
				"costType": order.costtype_yly,
				"bizFunction": order.biz_function,
				"money_a": order.dismoney_a_yly ? order.dismoney_a_yly : order.money_a_yly,
				"money_b": order.dismoney_b_yly ? order.dismoney_b_yly : order.money_b_yly,
				"money_c": order.dismoney_c_yly ? order.dismoney_c_yly : order.money_c_yly,
				"money_d": order.dismoney_d_yly ? order.dismoney_d_yly : order.money_d_yly,
				"money_e": order.dismoney_e_yly ? order.dismoney_e_yly : order.money_e_yly,
				"money_f": order.dismoney_f_yly ? order.dismoney_f_yly : order.money_f_yly,
				"duration_price": order.dismoney_time_yly ? order.dismoney_time_yly : order.money_time_yly,
				"money_ex": order.disovermoney_yly ? order.disovermoney_yly : order.overmoney_yly,
				"recordMode": order.recordMode_yly ? order.recordMode_yly : 0
			}
		}

		// 开始同步
		return new Promise(async resolve => {
			logger.debug('开始调用号池接口')
			logger.debug('传递的数据', postData)
			request({
				url: HTTP_SYNCTOPOOL_URL,
				method: "POST",
				json: true,
				headers: {
					"Content-Type": "application/json",
					"Host": myURL.host
				},
				body: postData
			}, async function (error, response, body) {
				logger.debug('号池返回的内容', body)
				if (error) {
					let type = order.pro_type === '1' ? 'yly' : (order.pro_type === '2' ? 'yzj' : 'gzh')
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
				if (body.code != "0") {
					insStatus += ("msg: " + body.msg)
					return resolve({ status: false, msg: insStatus })
				}
				return resolve({ status: true, msg: "成功" })
			})
		}).then(async rstSync => { // 修改客户表同步状态 需要等到都插入完毕以后
			let returnData, returnMsg, type
			type = order.pro_type === '1' ? '云录音' : (order.pro_type === '2' ? '云中继' : '工作号')
			if (rstSync.status === true) {
				passTotal++
				returnMsg = (operation === "1") ? "新增成功" : "修改成功"
				await colle.updateOne({ _id: ObjectId(order._id) }, { $set: { pool_sync_time: current, pool_sync_status: returnMsg } })
				returnData = { status: true, returnMsg }
			} else {
				abnormalTotal++
				returnMsg = rstSync.msg
				let syncTime = (operation === "1") ? "" : current
				await colle.updateOne({ _id: ObjectId(order._id) }, { $set: { pool_sync_time: syncTime, pool_sync_status: returnMsg } })
				returnData = { status: false, msg: returnMsg }
			}

			// 记录日志
			const modelD = new modelDocu()
			order.pool_sync_time = current
			order.pool_sync_status = returnMsg
			let { db, cl, operate_type } = options

			await modelD.dataActionLog(order, type + "订单同步(" + operate_type + ")", db, cl)

			return Promise.resolve(returnData)
		})
	})

	return Promise.all(rst).then(async () => {
		return [true, { abnormalTotal, passTotal }]
	})
}

module.exports = fnSync
