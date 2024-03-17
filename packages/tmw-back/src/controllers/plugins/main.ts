import _ from 'lodash'
import { ResultFault, ResultData } from 'tms-koa'
import PluginHelper from './pluginHelper.js'
import { PluginContext, ModelSchema } from 'tmw-kit'
import { PluginProfile } from 'tmw-data'
import { Base as CtrlBase } from 'tmw-kit/dist/ctrl/index.js'

/**
 * 插件控制器类
 */
class Plugin extends CtrlBase {
  pluginHelper

  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.pluginHelper = new PluginHelper(this)
  }
  /**
   *
   * @param schema_id
   * @returns
   */
  private async getClSchema(schema_id: string) {
    const modelSchema = new ModelSchema(
      this.mongoClient,
      this.bucket,
      this.client
    )

    // 集合的schema定义
    let clSchema
    if (schema_id && typeof schema_id === 'string')
      clSchema = await modelSchema.bySchemaId(schema_id, {
        onlyProperties: false,
      })

    return clSchema
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
    const { scope, db, cl, spreadsheet: forSpreadsheet } = this.request.query
    if (!['document', 'collection', 'database'].includes(scope))
      return new ResultFault(`参数错误[scope=${scope}]`)

    const ins = await PluginContext.ins()

    // 适用于指定管理对象类型的所有插件
    let plugins: PluginProfile[] =
      scope === 'document'
        ? ins.docPlugins
        : scope === 'collection'
        ? ins.clPlugins
        : ins.dbPlugins

    /**检查标签是否匹配 */
    let objTags, tmwCl, clSchema
    if (scope === 'document') {
      tmwCl = await this.pluginHelper.findRequestCl()
      clSchema = await this.getClSchema(tmwCl.schema_id)
      objTags = Array.isArray(tmwCl.tags) ? tmwCl.tags : []
    } else {
      objTags = []
    }

    /**进行筛选*/
    plugins = plugins.filter((plugin) => {
      let {
        bucketName,
        dbName,
        clName,
        rejectedRight,
        schemaName,
        excludeTags,
        everyTags,
        someTags,
        dbBlacklist,
        clBlacklist,
        schemaBlacklist,
        spreadsheet,
        // match,
      } = plugin
      // 自由表格适用的插件
      if (forSpreadsheet === 'true') {
        if (spreadsheet !== true) return false
      } else {
        if (spreadsheet === true) return false
      }
      // check black list
      if (dbBlacklist && dbBlacklist instanceof RegExp)
        if (dbBlacklist.test(db) === true) return false

      if (clBlacklist && clBlacklist instanceof RegExp) {
        if (clBlacklist.test(cl) === true) return false
      }
      if (schemaBlacklist && schemaBlacklist instanceof RegExp) {
        if (!clSchema?.name) return false
        if (schemaBlacklist.test(clSchema.name) === true) return false
      }

      if (bucketName && bucketName instanceof RegExp && this.bucket) {
        if (bucketName.test(this.bucket) === false) return false
      }

      if (dbName && dbName instanceof RegExp)
        if (dbName.test(db) === false) return false

      if (clName && clName instanceof RegExp) {
        if (clName.test(cl) === false) return false
      }
      /**
       * 检查权限
       */
      if (Array.isArray(rejectedRight) && rejectedRight.length) {
        if (Array.isArray(tmwCl.right) && tmwCl.right.length) {
          const result = _.intersection(tmwCl.right, rejectedRight)
          if (result.length) return false
        }
      }
      if (schemaName && schemaName instanceof RegExp) {
        if (!clSchema?.name) return false
        if (schemaName.test(clSchema.name) === false) return false
      }
      // if (match && typeof match === 'function') {
      //   console.log('mmm', match)
      //   if (scope === 'document') {
      //     if (true !== (await match(existCl))) return false
      //   }
      // }

      // 集合标签中不能包括指定的标签
      if (Array.isArray(excludeTags) && excludeTags.length)
        if (_.intersection(excludeTags, objTags).length) return false

      // 集合标签中包括指定的所有标签
      if (Array.isArray(everyTags) && everyTags.length)
        if (_.difference(everyTags, objTags).length) return false

      // 集合标签中包括至少1个指定标签
      if (Array.isArray(someTags) && someTags.length)
        if (_.intersection(someTags, objTags).length === 0) return false

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

    const condition = await plugin.remoteWidgetOptions(
      bucket,
      db,
      cl,
      this.request.body
    )

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

    if (plugin.scope) {
      let arg
      switch (plugin.scope) {
        case 'collection':
          arg = await this.pluginHelper.findRequestDb()
          break
        case 'document':
          arg = await this.pluginHelper.findRequestCl()
          break
      }
      const { code, msg } = await plugin.execute(this, arg)
      if (code !== 0) return new ResultFault(msg)
      return new ResultData(msg)
    }

    return new ResultData('ok')
  }
}

export default Plugin
