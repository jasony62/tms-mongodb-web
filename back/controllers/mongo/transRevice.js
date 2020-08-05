const { ResultData, ResultFault } = require('tms-koa')
const _ = require('lodash')
const DocBase = require('../documentBase')
const DocModel = require('../../models/mgdb/document')
const ColModel = require('../../models/mgdb/collection')
const syncToPool = require('../../plugins/fnSyncPool')
const syncToWork = require('../../plugins/fnSyncWork')
const log4js = require('log4js')
const { ObjectId } = require('mongodb')
const logger = log4js.getLogger('tms-mongoorder-transrevice')
const APPCONTEXT = require('tms-koa').Context.AppContext
const TMWCONFIG = APPCONTEXT.insSync().appConfig.tmwConfig

class TransRevice extends DocBase {
  constructor(...args) {
    super(...args)
  }
  static tmsAuthTrustedHosts() {
    return true
  }
  async revice(dbName, clName, callback) {
    const dbQuery = { name: dbName, type: 'database' }
    const database = await this.docHelper.clMongoObj.findOne(dbQuery)
    if (!database) {
      let logMsg = '指定的数据库不可访问'
      logger.debug(logMsg)
      return (new ResultFault(logMsg))
    }

    const clQuery = { name: clName, type: 'collection', database: database.name }
    const collection = await this.docHelper.clMongoObj.findOne(clQuery)
    if (!collection) {
      let logMsg = '指定的集合不可访问'
      logger.info(logMsg)
      return (new ResultFault(logMsg))
    }

    const currentSchema = await ColModel.getSchemaByCollection(database, clName)
    if (!currentSchema) {
      let logMsg = '指定的集合未指定集合列'
      logger.info(logMsg)
      return (new ResultFault(logMsg))
    }
    return callback(database, clName, currentSchema)
  }
  /**
   *
   *
   * @returns 
   * @memberof TransRevice
   */
  async crm() {
    //所有的字段
    const allFields = {}
    let doc = this.request.body
    let _create = (database, clName, schema) => {
      switch (doc.state) {
        case '1':
          return this.purchase(database, clName, schema, doc)
        case '2':
          return this.update(database, clName, schema, doc)
        case '3':
          return this.unpurchase(database, clName, schema, doc)
        default:
          return new ResultFault('暂不处理此种业务类型')
      }
    }
    //this.revice('official_order_info', 'official_order_info', _create)
    return this.revice('testSync', 'testPool1', _create)
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
    // 补默认值
    Object.entries(schema).forEach(([key, value]) => {
      if (value.default) doc[key] = value.default
    })
    console.log('purchase', doc)
    // 加工数据
    this._beforeProcessByInAndUp(doc, 'insert')

    return this.mongoClient
      .db(database.sysname)
      .collection(clName)
      .insertOne(doc)
      .then(async result => {
        let modelD = new DocModel()
        await modelD.dataActionLog(result.ops, '订购', database.name, clName)
        return new ResultData({})
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
  async update(database, clName, schema, doc) {
    let cl = this.mongoClient.db(database.sysname).collection(clName)
    let oldDoc = await cl.findOne({ 'order_id': doc.order_id })
    if (oldDoc === null) return new ResultData('订单不存在')

    console.log('update前', oldDoc)

    let slimDoc = _.omit(doc, ['order_id'])
    return cl.updateOne({ 'order_id': doc.order_id }, { $set: slimDoc }).then(async () => {
      let newDoc = await cl.findOne({ 'order_id': doc.order_id })
      // 加工数据
      this._beforeProcessByInAndUp(newDoc, 'update')
      // 日志
      if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
        let modelD = new DocModel()
        await modelD.dataActionLog(newDoc, '变更', database.name, clName, '', '', JSON.stringify(oldDoc))
      }

      console.log('update后', newDoc)

      // 如果有状态没有时间应该删掉状态再同步;
      this.sync(newDoc, schema, cl, database, clName)

      return new ResultData({})
    })
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
  async unpurchase(database, clName, schema, doc) {
    let cl = this.mongoClient.db(database.sysname).collection(clName)
    let oldDoc = cl.findOne({ 'order_id': doc.order_id })

    if (oldDoc.status === '99') {
      return new ResultFault('该订单已是退订状态')
    }
    if (oldDoc.hasNumber === '2') {
      return new ResultFault('该订单下还存在号码，不可退订')
    }

    return cl.updateOne({ 'order_id': doc.order_id }, { $set: { 'status': '99' } }).then(async () => {
      let newDoc = await cl.findOne({ 'order_id': doc.order_id })
      // 加工数据
      this._beforeProcessByInAndUp(newDoc, 'update')
      // 日志
      if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG === 'Y') {
        let modelD = new DocModel()
        await modelD.dataActionLog(newDoc, '退订', database.name, clName, '', '', JSON.stringify(oldDoc))
      }
      // 如果有状态没有时间应该删掉状态再同步;
      this.sync(newDoc, schema, cl, database, clName)

      return new ResultData({})
    })
  }
  sync(newDoc, schema, cl, database, clName) {
    if (!newDoc.pool_sync_time) newDoc.pool_sync_status = ""
    if (!newDoc.work_sync_time) newDoc.work_sync_status = ""

    let orders = await cl.find({ '_id': new ObjectId(newDoc._id) }).toArray()
    syncToPool(JSON.parse(JSON.stringify(orders)), schema, cl, { dl: database.name, cl: clName, operate_type: '按选中' })
    syncToWork(JSON.parse(JSON.stringify(orders)), schema, cl, { db: database.name, cl: clName, operate_type: '按选中' })
  }
}

module.exports = TransRevice
