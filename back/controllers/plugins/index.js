const { ResultFault, ResultData } = require('tms-koa')
const fs = require('fs')
const path = require('path')
const PluginConfig = require('../../models/mgdb/plugin')
const PluginHelper = require('./pluginHelper')
const SendBase = require('./sendBase')
const log4js = require('log4js')
const logger = log4js.getLogger('tms-mongodb-web')

/** 插件控制器类 */
class Plugin extends SendBase {
  constructor(...args) {
    super(...args)
    this.pluginHelper = new PluginHelper(this)
  }
  /**
   * @swagger
   *
   * /api/plugins/pluginDb:
   *   get:
   *     tags:
   *       - plugin
   *     summary: 获取用于处理db对象的插件列表
   *     responses:
   *       '200':
   *         description: result为插件数组
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseDataArray"
   */
  async pluginDb() {
    const { commonConfig } = PluginConfig.ins()

    if (!commonConfig || !commonConfig.db) return new ResultData({})

    return new ResultData(commonConfig.db)
  }
  /**
   * @swagger
   *
   * /api/plugins/pluginCollection:
   *   get:
   *     tags:
   *       - plugin
   *     summary: 获取用于处理collection对象的插件列表
   *     responses:
   *       '200':
   *         description: result为插件数组
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseDataArray"
   */
  async pluginCollection() {
    const { commonConfig } = PluginConfig.ins()

    if (!commonConfig || !commonConfig.collection) return new ResultData({})

    return new ResultData(commonConfig.collection)
  }
  /**
   * @swagger
   *
   * /api/plugins/pluginDocument:
   *   get:
   *     tags:
   *       - plugin
   *     summary: 获取用于处理document对象的插件列表
   *     responses:
   *       '200':
   *         description: result为插件数组
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseDataArray"
   */
  async pluginDocument() {
    const { commonConfig } = PluginConfig.ins()

    if (!commonConfig || !commonConfig.document) return new ResultData({})

    return new ResultData(commonConfig.document)
  }
  /**
   * name 文件名
   */
  loadNativeFile(name) {
    let filePath = path.resolve('plugins', `${name}.js`)
    if (fs.existsSync(filePath)) {
      logger.info(`加载[${filePath}]`)
      return filePath
    } else {
      logger.warn(`${filePath}文件不存在`)
      return ''
    }
  }
  /**
   * args 环境参数
   * queryParams get参数
   * postParams post参数
   */
  async execNativeModule(
    ctx,
    client,
    dbContext,
    mongoClient,
    mongoose,
    pushContext,
    name,
    queryParams,
    postParams
  ) {
    let path = this.loadNativeFile(name)
    if (!path) return false

    let modules = require(path)
    return await new modules(
      ctx,
      client,
      dbContext,
      mongoClient,
      mongoose,
      pushContext
    ).exec(queryParams, postParams)
  }
  /**
   * @description 插件实现机制
   * @param {string} type
   */
  /**
   * @swagger
   *
   * /api/plugins/commonExecute:
   *   post:
   *     tags:
   *       - plugin
   *     summary: 执行指定的插件
   *     responses:
   *       '200':
   *         description: result为
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async commonExecute() {
    let { dbName, clName, type, name } = this.request.query
    if (!dbName || !clName || !type || !name) {
      return Promise.resolve(
        new ResultFault('缺少dbName或clName或type或methods参数')
      )
    }
    if (type === 'http') {
      return this.exec(name, queryParams, this.request.body)
    } else if (type === 'native') {
      return await this.execNativeModule(
        this.ctx,
        this.client,
        this.dbContext,
        this.mongoClient,
        this.mongoose,
        this.pushContext,
        name,
        this.request.query,
        this.request.body
      )
    } else {
      return new ResultFault('暂不处理此类型的插件')
    }
  }
}

module.exports = Plugin
