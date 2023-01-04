import { ResultData, ResultFault } from 'tms-koa'
import * as _ from 'lodash'
import SchemaBase from '../schemaBase'
import * as mongodb from 'mongodb'
const ObjectId = mongodb.ObjectId

/** 管理端文档列定义对象控制器 */
class Schema extends SchemaBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * @swagger
   *
   * /api/admin/schema/list:
   *   get:
   *     tags:
   *       - admin
   *     summary: 列出已有文档列定义
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - name: scope
   *         description: 文档列定义使用对象范围，包括：文档（document），数据库（db）或集合（collection），不指定为document，可以用逗号分割指定多个使用对象类型。
   *         in: query
   *         schema:
   *           type: string
   *           enum:
   *             - document
   *             - collection
   *             - db
   *     responses:
   *       '200':
   *         description: result为文档列定义数组
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseDataArray"
   */
  async list() {
    return super.list()
  }
  /**
   * @swagger
   *
   * /api/admin/schema/listSimple:
   *   get:
   *     tags:
   *       - admin
   *     summary: 列出已有文档列定义
   *     description: 列出已有文档列定义，结果中包含：title, description, scope。
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - name: scope
   *         description: 文档列定义使用对象范围，包括：文档（document），数据库（db）或集合（collection），不指定为document
   *         in: query
   *         schema:
   *           type: string
   *           enum:
   *             - document
   *             - collection
   *             - db
   *     responses:
   *       '200':
   *         description: result为文档列定义数组，结果中包含：title, description, scope。
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseDataArray"
   */
  async listSimple() {
    return super.listSimple()
  }
  /**
   * @swagger
   *
   * /api/admin/schema/create:
   *   post:
   *     tags:
   *       - admin
   *     summary: 新建文档列定义
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               scope:
   *                 description: 文档列定义适用对象。
   *                 type: string
   *                 enum:
   *                   - document
   *                   - collection
   *                   - db
   *               title:
   *                 description: 文档列定义标题。
   *                 type: string
   *               body:
   *                 description: 文档列定义内容，符合json-schema规范。
   *                 type: object
   *             required:
   *               - scope
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"scope": "collection", "name": "col01"}
   *     responses:
   *       '200':
   *         description: result为创建的集合
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async create() {
    return super.create()
  }
  /**
   * @swagger
   *
   * /api/admin/schema/update:
   *   post:
   *     tags:
   *       - admin
   *     summary: 更新文档列定义
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/docSchemaId'
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 description: 文档列定义标题。
   *                 type: string
   *               body:
   *                 description: 文档列定义内容，符合json-schema规范。
   *                 type: object
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"name": "文档列定义01", "body":{}}
   *     responses:
   *       '200':
   *         description: result为更新后的文档列定义
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async update() {
    const { id } = this.request.query
    let info = this.request.body
    const { scope } = info
    info = _.omit(info, ['_id', 'scope', 'bucket'])
    if (typeof info.order !== 'number') info.order = 9999

    const query: any = { _id: new ObjectId(id), type: 'schema' }
    if (this.bucket) query.bucket = this.bucket.name

    return this['clMongoObj']
      .updateOne(query, { $set: info }, { upsert: true })
      .then(() => {
        info.scope = scope
        return new ResultData(info)
      })
  }
  /**
   * @swagger
   *
   * /api/admin/schema/remove:
   *   get:
   *     tags:
   *       - admin
   *     summary: 删除文档列定义
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/docSchemaId'
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/ResponseOK'
   *
   */
  async remove() {
    const { id } = this.request.query
    if (!id) return new ResultFault('参数不完整')

    // 是否正在使用
    let rst = await this.clMongoObj.findOne({
      schema_id: id,
      type: 'collection',
    })
    if (rst) {
      return new ResultFault(
        `文档列定义正在被[${rst.database}]数据库中的[${rst.name}]集合使用，不能删除`
      )
    }
    const query: any = { _id: new ObjectId(id), type: 'schema' }
    if (this.bucket) query.bucket = this.bucket.name
    return this.clMongoObj.deleteOne(query).then(() => new ResultData('ok'))
  }
}

export = Schema
