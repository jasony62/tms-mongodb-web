import * as _ from 'lodash'
import { ResultData, ResultFault } from 'tms-koa'
import Base from 'tmw-kit/dist/ctrl/base'
import * as mongodb from 'mongodb'
const ObjectId = mongodb.ObjectId

/** 管理对象（数据库、集合和文档）的扩展属性定义 */
class Schema extends Base {
  constructor(...args) {
    super(...args)
  }
  /**
   * @swagger
   *
   * /api/system/schema/create:
   *   post:
   *     tags:
   *       - system
   *     summary: 创建预制系统管理对象扩展定义
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 description: 扩展定义中文名称。
   *                 type: string
   *               scope:
   *                 description: 适用对象类型：文档（document），数据库（db）或集合（collection）。
   *                 type: string
   *               description:
   *                 description: 扩展定义说明。
   *                 type: string
   *               body:
   *                 description: 扩展定义内容，符合json-schema规范。
   *                 type: string
   *             required:
   *               - title
   *               - scope
   *               - body
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"titile": "扩展定义", "scope": "db", "description": "扩展定义说明", "body": "扩展定义内容"}
   *     responses:
   *       '200':
   *         description: result为创建的扩展定义
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async create() {
    let info = this['request'].body
    info.type = 'schema'
    if (!info.scope) return new ResultData('没有指定属性定义适用对象类型')

    return this['clPreset'].insertOne(info).then((result) => {
      info._id = result.insertedId
      return new ResultData(info)
    })
  }
  /**
   * @swagger
   *
   * /api/system/schema/update:
   *   post:
   *     tags:
   *       - system
   *     summary: 更改预制管理对象扩展定义
   *     parameters:
   *       - name: id
   *         description: 预制管理对象扩展定义id
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 description: 扩展定义中文名称。
   *                 type: string
   *               description:
   *                 description: 扩展定义说明。
   *                 type: string
   *               body:
   *                 description: 扩展定义内容，符合json-schema规范。
   *                 type: string
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"title": "标题", "description": "说明", "body": {}}
   *     responses:
   *       '200':
   *         description: result为更新后的预制管理对象扩展定义
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async update() {
    const { id } = this['request'].query
    let info = this['request'].body
    info = _.omit(info, ['_id', 'scope', 'type'])

    const query = { _id: new ObjectId(id), type: 'schema' }

    return this['clPreset']
      .updateOne(query, { $set: info }, { upsert: true })
      .then(() => new ResultData(info))
  }
  /**
   * @swagger
   *
   * /api/system/schema/remove:
   *   get:
   *     tags:
   *       - system
   *     summary: 删除预制管理对象扩展定义
   *     parameters:
   *       - name: id
   *         description: 预制管理对象扩展定义id
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: result为ok
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async remove() {
    const { id } = this['request'].query
    if (!id) return new ResultFault('参数不完整')

    // 是否正在使用
    // 为什么不检查数据库和文档对象？
    let rst = await this['clPreset'].findOne({
      schema_id: id,
      type: 'collection',
    })
    if (rst) return new ResultFault('扩展字段定义正在被使用不能删除')

    const query = { _id: new ObjectId(id), type: 'schema' }

    return this['clPreset'].deleteOne(query).then(() => new ResultData('ok'))
  }
  /**
   * @swagger
   *
   * /api/system/schema/list:
   *   get:
   *     tags:
   *       - system
   *     summary: 列出已有预制管理对象扩展定义
   *     parameters:
   *       - name: scope
   *         description: 管理对象类型
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: result为预制管理对象扩展定义数组
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async list() {
    const { scope } = this['request'].query
    if (!/db|collection|document/.test(scope))
      return new ResultData('没有指定有效的属性定义适用对象类型')

    const query = { type: 'schema', scope }

    return this['clPreset']
      .find(query, { projection: { type: 0, scope: 0 } })
      .toArray()
      .then((schemas) => new ResultData(schemas))
  }
  /**
   * @swagger
   *
   * /api/system/schema/listSimple:
   *   get:
   *     tags:
   *       - system
   *     summary: 列出已有预制管理对象扩展定义
   *     description: 列出已有预制管理对象扩展定义，不包含body字段。
   *     parameters:
   *       - name: scope
   *         description: 管理对象类型
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: result为预制管理对象扩展定义数组
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async listSimple() {
    const { scope } = this['request'].query
    if (!/db|collection|document/.test(scope))
      return new ResultData('没有指定有效的属性定义适用对象类型')

    const query = { type: 'schema', scope }

    return this['clPreset']
      .find(query, {
        projection: { _id: 1, title: 1, description: 1, scope: 1 },
      })
      .toArray()
      .then((schemas) => new ResultData(schemas))
  }
}

export default Schema
