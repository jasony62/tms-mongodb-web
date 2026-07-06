import _ from 'lodash'
import { ResultData, ResultFault } from 'tms-koa'
import { ModelTag } from 'tmw-kit'
import TagBase from '../tagBase.js'

/** 标签 */
class Tag extends TagBase {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
  /**
   * @swagger
   *
   * /api/admin/tag/create:
   *   post:
   *     tags:
   *       - admin
   *     summary: 新建标签
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 description: 标签名称
   *                 type: string
   *             required:
   *               - name
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"name": "标签01"}
   *     responses:
   *       '200':
   *         description: result为创建的标签
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async create() {
    let info = this.request.body
    info.name = info.name.replace(/(^\s*)|(\s*$)/g, '')

    if (this.bucket && typeof this.bucket === 'object')
      info.bucket = this.bucketObj.name

    const modelTag = new ModelTag(this.mongoClient, this.bucket, this.client)

    // 查询是否存在同名标签
    let existTag = await modelTag.findByName(info.name, info.bucket)
    if (existTag) return new ResultFault('已存在同名标签')

    const result = await modelTag.create(info)
    return new ResultData(result)
  }
  /**
   * @swagger
   *
   * /api/admin/tag/update:
   *   post:
   *     tags:
   *       - admin
   *     summary: 更新标签
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - name: id
   *         description: 标签的id
   *         in: query
   *         schema:
   *           type: string
   *         required: true
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 description: 标签名称
   *                 type: string
   *             required:
   *               - name
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"name": "标签01"}
   *     responses:
   *       '200':
   *         description: result为更新后的标签
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async update() {
    const { id } = this.request.query
    let info = this.request.body

    const modelTag = new ModelTag(this.mongoClient, this.bucket, this.client)

    // 查询是否存在同名标签
    let existTag = await modelTag.findByName(info.name, this.bucketObj?.name)
    if (existTag) return new ResultFault('已存在同名标签')

    info = _.omit(info, ['_id', 'type', 'bucket'])

    await modelTag.update(id, this.bucketObj?.name, info)
    return new ResultData(info)
  }
  /**
   * @swagger
   *
   * /api/admin/tag/remove:
   *   get:
   *     tags:
   *       - admin
   *     summary: 删除标签
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - name: name
   *         description: 标签名称
   *         in: query
   *         schema:
   *           type: string
   *         required: true
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/ResponseOK'
   *
   */
  async remove() {
    const { name } = this.request.query
    if (!name) return new ResultFault('参数不完整')

    const modelTag = new ModelTag(this.mongoClient, this.bucket, this.client)

    // 是否正在使用
    let rst = await modelTag.checkInUse(name)
    if (rst) {
      return new ResultFault('标签正在被使用不能删除')
    }

    await modelTag.remove(name, this.bucketObj?.name)
    return new ResultData('ok')
  }
}

export default Tag
