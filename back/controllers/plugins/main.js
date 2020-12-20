const _ = require('lodash')

const { ResultFault, ResultData } = require('tms-koa')
const Base = require('../base')
const PluginConfig = require('../../models/mgdb/plugin')
const SendConfig = require('./send')
const NativeConfig = require('../../plugins')

const PluginHelper = require('./pluginHelper')
const PluginContext = require('../../models/plugin/context').Context

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
   *     deprecated: true
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
   *     deprecated: true
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
   *     deprecated: true
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
   * @swagger
   *
   * /api/plugins/commonExecute:
   *   post:
   *     tags:
   *       - plugin
   *     summary: 执行指定的插件
   *     deprecated: true
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
  /**
   * @swagger
   *
   * /api/plugins/list:
   *   get:
   *     tags:
   *       - plugin
   *     summary: 获取用于处理document对象的插件列表
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbName'
   *       - $ref: '#/components/parameters/clName'
   *       - name: scope
   *         description: 插件适用对象
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: result为插件数组
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseDataArray"
   */
  async list() {
    const { scope } = this.request.query
    if (!['document', 'collection', 'database'].includes(scope))
      return new ResultFault(`参数错误[scope=${scope}]`)

    const ins = await PluginContext.ins()

    let plugins =
      scope === 'document'
        ? ins.docPlugins
        : scope === 'collection'
        ? ins.clPlugins
        : ins.dbPlugins

    /**检查标签是否匹配 */
    let objTags
    if (scope === 'document') {
      const existCl = await this.pluginHelper.findRequestCl()
      objTags = Array.isArray(existCl.tags) ? existCl.tags : []
    } else {
      objTags = []
    }

    plugins = plugins.filter((plugin) => {
      let { excludeTags, everyTags, someTags } = plugin
      // 集合标签中不能包括指定的标签
      if (Array.isArray(excludeTags) && excludeTags.length)
        if (_.intersection(excludeTags, objTags).length) return false
      // 集合标签中包括指定的所有标签
      if (Array.isArray(everyTags) && everyTags.length)
        if (_.difference(everyTags, objTags).length) return false
      // 集合标签中包括至少1个指定标签
      if (Array.isArray(someTags) && someTags.length)
        if (_.intersection(everyTags, objTags).length === 0) return false

      return true
    })

    return new ResultData(plugins)
  }
  /**
   * @swagger
   *
   * /api/plugins/remoteWidgetOptions:
   *   post:
   *     tags:
   *       - plugin
   *     summary: 获取插件的前置条件
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbName'
   *       - $ref: '#/components/parameters/clName'
   *       - name: plugin
   *         in: query
   *         description: 插件名称
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               filter:
   *                 description: 什么逻辑？
   *                 type: string
   *     responses:
   *       '200':
   *         description: result为前置条件对象
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async remoteWidgetOptions() {
    let { bucket, db, cl, plugin: pluginName } = this.request.query

    if (!pluginName) return new ResultFault('缺少plugin参数')

    const ins = await PluginContext.ins()

    const plugin = ins.byName(pluginName)
    if (!plugin) return new ResultFault(`未找到指定插件[plugin=${pluginName}]`)

    if (typeof plugin.remoteWidgetOptions !== 'function')
      return new ResultFault(
        `插件[plugin=${plugin.name}]没有定义[remoteWidgetOptions]方法`
      )

    const condition = await plugin.remoteWidgetOptions(bucket, db, cl)

    return new ResultData(condition)
  }
  /**
   * @swagger
   *
   * /api/plugins/execute:
   *   post:
   *     tags:
   *       - plugin
   *     summary: 执行指定的插件
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbName'
   *       - $ref: '#/components/parameters/clName'
   *       - name: plugin
   *         in: query
   *         description: 插件名称
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               docIds:
   *                 description: 文档id数组
   *                 type: array
   *               filter:
   *                 description: 筛选条件
   *                 type: object
   *               related:
   *                 description: 选择的相关文档
   *                 type: object
   *                 properties:
   *                   docIds:
   *                     description: 文档id数组
   *                     type: array
   *           examples:
   *             basic:
   *               summary: 基本示例
   *               value: {"docIds": [], "filter": {}, "related": {"docIds": []}}
   *     responses:
   *       '200':
   *         description: result为插件执行情况的说明
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   *             examples:
   *               documents:
   *                 summary: 文档对象
   *                 value: {"type":"documents", "inserted":[{"_id":""}], "modified":[{"_id":""}], "removed":[""]}
   *               numbers:
   *                 summary: 文档数量
   *                 value: {"type":"numbers", "nInserted":0, "nModified":0, "nRemoved":0}
   *               message:
   *                 summary: 文本消息
   *                 value: "执行完毕"
   */
  async execute() {
    let { plugin: pluginName } = this.request.query

    if (!pluginName) return new ResultFault('缺少plugin参数')

    const ins = await PluginContext.ins()

    const plugin = ins.byName(pluginName)
    if (!plugin) return new ResultFault(`未找到指定插件[plugin=${pluginName}]`)

    if (plugin.scope === 'document') {
      const existCl = await this.pluginHelper.findRequestCl()
      const result = await plugin.execute(this, existCl)
      return new ResultData(result)
    }

    return new ResultData('ok')
  }
}

module.exports = Plugin
