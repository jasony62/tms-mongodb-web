import { ResultData, ResultFault } from 'tms-koa'
import BucketBase from '../../bucketBase.js'
import ModelBucket from 'tmw-kit/dist/model/bucket.js'

/** 用于给用户分配存储空间 */
class Bucket extends BucketBase {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
  /** 执行方法调用前检查 */
  async tmsBeforeEach() {
    if (!this['client'])
      return new ResultFault('只有通过认证的用户才可以执行该操作')
    let result: any = await super.tmsBeforeEach()
    if (true !== result) return result
    return true
  }
  /**
   * @swagger
   *
   * /api/admin/bucket/create:
   *   post:
   *     tags:
   *       - admin
   *     summary: 新建存储空间
   *     description: 新建存储空间。空间名称不允许重复。
   *     security:
   *       - HeaderTokenAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 description: 存储空间名称。
   *                 type: string
   *               title:
   *                 description: 存储空间标题。
   *                 type: string
   *               description:
   *                 description: 存储空间标题。
   *                 type: string
   *             required:
   *               - name
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"name": "bucket01", "title": "空间01", "description": "空间01说明"}
   *     responses:
   *       '200':
   *         description: result为创建的空间
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async create() {
    const modelBucket = new ModelBucket(
      this.mongoClient,
      this.bucketObj,
      this.client
    )
    const [ok, result] = await modelBucket.create(this['request'].body)
    return ok ? new ResultData(result) : new ResultFault(result)
  }
  /**
   * @swagger
   *
   * /api/admin/bucket/update:
   *   post:
   *     tags:
   *       - admin
   *     summary: 更新存储空间
   *     description: 更新存储空间。空间名称不允许重复。
   *     security:
   *       - HeaderTokenAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               title:
   *                 description: 存储空间标题。
   *                 type: string
   *               description:
   *                 description: 存储空间标题。
   *                 type: string
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"title": "空间01", "description": "空间01说明"}
   *     responses:
   *       '200':
   *         description: result为更新后的空间
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async update() {
    const bucketName = this['request'].query.bucket
    const modelBucket = new ModelBucket(
      this.mongoClient,
      this.bucketObj,
      this.client
    )
    const [ok, result] = await modelBucket.update(
      bucketName,
      this['request'].body
    )
    return ok ? new ResultData(result) : new ResultFault(result)
  }
  /**
   * @swagger
   *
   * /api/admin/bucket/remove:
   *   get:
   *     tags:
   *       - admin
   *     summary: 删除存储空间
   *     security:
   *       - HeaderTokenAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *     responses:
   *       '200':
   *         description: result为？？？
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async remove() {
    const { bucket: bucketName } = this['request'].query
    const modelBucket = new ModelBucket(
      this.mongoClient,
      this.bucketObj,
      this.client
    )
    const [ok, result] = await modelBucket.remove(bucketName)
    return ok ? new ResultData(result) : new ResultFault(result)
  }
  /**
   * @swagger
   *
   * /api/admin/bucket/list:
   *   get:
   *     tags:
   *       - admin
   *     summary: 当前用户创建的存储空间
   *     security:
   *       - HeaderTokenAuth: []
   *     responses:
   *       '200':
   *         description: result为存储空间数组
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseDataArray"
   */
  async list() {
    const modelBucket = new ModelBucket(
      this.mongoClient,
      this.bucketObj,
      this.client
    )
    const tmsBuckets = await modelBucket.list()
    return new ResultData(tmsBuckets)
  }
}

export default Bucket
