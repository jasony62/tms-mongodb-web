import { omit } from 'es-toolkit'
import { ResultData, ResultFault } from 'tms-koa'
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

    if (this.bucketObj && typeof this.bucketObj === 'object')
      info.bucket = this.bucketObj.name

    // 查询是否存在同名标签
    let existTag = await this.tagHelper.tagByName(info.name)
    if (existTag) return new ResultFault('已存在同名标签')

    const [flag, result] = await this.tagHelper.createTag(info)
    if (!flag) return new ResultFault(result)

    return new ResultData(result)
  }
  /**
   * 删除标签
   * @returns
   */
  async remove() {
    const { id } = this.request.query

    const [flag, result] = await this.tagHelper.removeTag(id)
    if (!flag) return new ResultFault(result)

    return new ResultData(result)
  }
  /**
   * 新建标签关系
   * @returns
   */
  async createRelation() {
    let relation = this.request.body

    if (this.bucketObj && typeof this.bucketObj === 'object')
      relation.bucket = this.bucketObj.name

    const { tagId, target } = relation
    const [flag, result] = await this.tagHelper.createTagRelation(tagId, target)
    if (!flag) return new ResultFault(result)

    return new ResultData(result)
  }
  /**
   * 删除标签关系
   * @returns
   */
  async removeRelation() {
    let relation = this.request.body

    if (this.bucketObj && typeof this.bucketObj === 'object')
      relation.bucket = this.bucketObj.name

    const { tagId, target } = relation
    const [flag, result] = await this.tagHelper.removeTagRelation(tagId, target)
    if (!flag) return new ResultFault(result)

    return new ResultData(result)
  }
  /**
   * 列出标签关系
   * @returns
   */
  async listRelation() {
    const [flag, result] = await this.tagHelper.listTagRelation()
    if (!flag) return new ResultFault(result)

    return new ResultData(result)
  }
}

export default Tag
