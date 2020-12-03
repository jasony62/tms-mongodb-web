const { ResultFault, ResultData } = require('tms-koa')
const Base = require('../base')
const PluginConfig = require('../../models/mgdb/plugin')
const PluginHelper = require('./pluginHelper')
const SendConfig = require('./send')
const NativeConfig = require('../../plugins')

/** 插件控制器类 */
class Plugin extends Base {
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

    return new ResultData(commonConfig.document)
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
    const queryParams = { dbName: dbName, clName: clName }
    if (!dbName || !clName || !type || !name) {
      return Promise.resolve(
        new ResultFault('缺少dbName或clName或type或methods参数')
      )
    }
    if (type === 'http') {
      return new SendConfig(
        this.ctx,
        this.client,
        this.dbContext,
        this.mongoClient,
        this.mongoose,
        this.pushContext
      ).exec(name, queryParams, this.request.body)
    } else if (type === 'native') {
      return new NativeConfig().exec(name, queryParams, this.request.body)
    } else {
      return new ResultFault('暂不处理此类型的插件')
    }
  }
}

module.exports = Plugin
