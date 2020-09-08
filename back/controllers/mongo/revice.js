const { ResultData, ResultFault } = require('tms-koa')
const _ = require('lodash')
const DocBase = require('../documentBase')
const DocModel = require('../../models/mgdb/document')
const ColModel = require('../../models/mgdb/collection')
const log4js = require('log4js')
const logger = log4js.getLogger('tms-mongoorder-transrevice')
const APPCONTEXT = require('tms-koa').Context.AppContext
const TMWCONFIG = APPCONTEXT.insSync().appConfig.tmwConfig

class Revice extends DocBase {
  constructor(...args) {
    super(...args)
  }
  static tmsAuthTrustedHosts() {
    return true
  }
  async revice(dbName, clName) {
    const dbQuery = { name: dbName, type: 'database' }
    const database = await this.docHelper.clMongoObj.findOne(dbQuery)
    if (!database) {
      let logMsg = '指定的数据库不可访问'
      logger.debug(logMsg)
      return [false, logMsg]
    }

    const clQuery = { name: clName, type: 'collection', database: database.name }
    const collection = await this.docHelper.clMongoObj.findOne(clQuery)
    if (!collection) {
      let logMsg = '指定的集合不可访问'
      logger.debug(logMsg)
      return [false, logMsg]
    }

    const currentSchema = await ColModel.getSchemaByCollection(database, clName)
    if (!currentSchema) {
      let logMsg = '指定的集合未指定集合列'
      logger.debug(logMsg)
      return [false, logMsg]
    }
    return [true, { database, clName, currentSchema }]
  }
  /**
   *
   *
   * @returns 
   * @memberof Revice
   */
  async crmInfo() {
    //所有的字段
    let param = this.request.body

    const requireFields = ["streamingNo", "OPFlag", "SIID", "productID", "bizID", "areaCode", "custID", "custAccount", "custName"]
    let missFields = requireFields.filter(field => !param[field])
    if (missFields.length) {
      return new ResultFault('缺少必传字段')
    }

    let docRes = await this.revice('official_order_info', 'official_order_info')
    if (docRes[0] === false) return (new ResultFault('发生不可预知的错误'))
    let { database, clName, currentSchema: schema } = docRes[1]

    //处理数据
    let doc = {}
    Object.assign(doc, param)
    doc.source = '1'
    doc.order_id = param.bizID
    doc.cust_id = param.custID
    doc.customer_id = param.custID
    doc.cust_name = param.custName
    doc.manager_name = param.managerName
    doc.account = param.managerAccount
    doc.cust_account = param.custAccount
    doc.manager_tel = param.managerTel
    doc.num_sum = param.numSum
    doc.areacode = param.areaCode
    doc.product_version = param.productVersion
    doc.biz_function = param.bizFunction && param.bizFunction.split(',')
    doc.num_type = param.numType && param.numType.split(',')
    doc.order_name = '领航订单custid=' + param.custID // 订单名

    // 产品类型
    switch (param.productID) {
      case '35831086':
        doc.pro_type = '1'
        doc.flag_playtips = 'Y'
        break;
      case '35831087':
        doc.pro_type = '2'
        break;
      case '35831088':
        doc.pro_type = '3'
        if (param.bizFunction === '1' || param.bizFunction === '1,2') {
          doc.flag_playtips = 'N'
        }
        break;
    }

    return ((database, clName, schema) => {
      if (param.OPFlag === '0101') {
        return this.purchase(database, clName, schema, doc)
      } else if (param.OPFlag === '0102') {
        return this.update(database, clName, doc)
      } else if (param.OPFlag === '0103') {
        return this.unpurchase(database, clName, doc)
      } else {
        return new ResultFault('暂不处理此类操作类型')
      }
    })(database, clName, schema)
    //return this.revice('official_order_info', 'official_order_info', oPerate)
  }
  /**
   *
   * 订购
   * @param {*} database 数据库
   * @param {*} clName 表
   * @param {*} doc 接收的数据
   * @returns
   * @memberof TransRevice
   */
  async purchase(database, clName, schema, doc) {
    Object.assign(doc, { 'status': '1', 'unsubscribe_number': '' })
    // 补默认值
    Object.entries(schema).forEach(([key, value]) => {
      if (value.default) doc[key] = doc[key] ? doc[key] : value.default
    })
    // 加工数据
    this._beforeProcessByInAndUp(doc, 'insert')
    doc.create_time = doc.TMS_DEFAULT_CREATE_TIME

    logger.debug('新增订单', doc)

    return this.mongoClient
      .db(database.sysname)
      .collection(clName)
      .insertOne(doc)
      .then(async result => {
        let modelD = new DocModel()
        await modelD.dataActionLog(result.ops, '订购', database.name, clName)
        return new ResultData({}, '订单订购成功')
      })
  }
  /**
   *
   * 变更
   * @param {*} database 数据库
   * @param {*} clName 表
   * @param {*} doc 接收的数据
   * @returns
   * @memberof TransRevice
   */
  async update(database, clName, doc) {
    let cl, oldDoc, newDoc

    cl = this.mongoClient.db(database.sysname).collection(clName)
    oldDoc = await cl.findOne({ 'order_id': doc.order_id })
    newDoc = {}
    logger.debug('update前原数据', oldDoc)

    Object.assign(newDoc, oldDoc, doc)
    newDoc = _.omit(newDoc, ['order_id'])

    // 加工数据
    this._beforeProcessByInAndUp(newDoc, 'update')
    // 日志
    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
      let modelD = new DocModel()
      await modelD.dataActionLog(newDoc, '变更', database.name, clName, '', '', JSON.stringify(oldDoc))
    }

    logger.debug('update传递的数据', newDoc)
    return cl.updateOne({ 'order_id': oldDoc.order_id }, { $set: newDoc }).then(() => new ResultData({}, '订单变更成功'))
  }
  /**
   *
   * 退订
   * @param {*} database 数据库
   * @param {*} clName 表
   * @param {*} doc 接收的数据
   * @returns
   * @memberof TransRevice
   */
  async unpurchase(database, clName, doc) {
    let cl, oldDoc, newDoc
    cl = this.mongoClient.db(database.sysname).collection(clName)
    oldDoc = await cl.findOne({ 'order_id': doc.order_id })
    newDoc = {}

    if (oldDoc.status === '99') {
      return new ResultFault('该订单已是退订状态')
    }
    if (oldDoc.unsubscribe_number === 'N') {
      return new ResultFault('该订单下还有号码不可退订')
    }
    logger.debug('退订前原数据', oldDoc)

    doc.status = '99'
    Object.assign(newDoc, oldDoc, doc)
    newDoc = _.omit(newDoc, ['order_id'])

    // 加工数据
    this._beforeProcessByInAndUp(newDoc, 'update')
    // 日志
    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
      let modelD = new DocModel()
      await modelD.dataActionLog(newDoc, '退订', database.name, clName, '', '', JSON.stringify(oldDoc))
    }

    logger.debug('退订传递的数据', newDoc)
    return cl.updateOne({ 'order_id': oldDoc.order_id }, { $set: newDoc }).then(() => new ResultData({}, '订单退订成功'))
  }
}

module.exports = Revice
