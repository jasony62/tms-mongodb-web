import { ResultData, ResultFault } from 'tms-koa'
import { Base } from 'tmw-kit/dist/ctrl/index.js'
import ModelBucket from 'tmw-kit/dist/model/bucket.js'

/** 空间用户管理控制器 */
class Coworker extends Base {
  /**
   * 执行方法调用前检查
   */
  async tmsBeforeEach(): Promise<true | ResultFault> {
    const { url } = this.request
    if (!this.client)
      return new ResultFault('只有通过认证的用户才可以执行该操作')
    if (url.split('?')[0].split('/').pop() === 'accept') return true
    let result = await super.tmsBeforeEach()
    if (true !== result) return result
    return true
  }
  /**
   * @swagger
   *
   * /api/admin/bucket/coworker/invite:
   *   post:
   *     tags:
   *       - admin
   *     summary: 创建空间邀请
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
   *               nickname:
   *                 description: 被邀请用户的昵称。
   *                 type: string
   *     responses:
   *       '200':
   *         description: result为4位字符的邀请码
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async invite() {
    if (!this['bucket']) return new ResultFault('没有指定邀请的空间')
    const { nickname } = this['request'].body
    if (!nickname) return new ResultFault('没有指定被邀请用户的昵称')

    const modelBucket = new ModelBucket(
      this.mongoClient,
      this.bucketObj,
      this.client
    )
    const [ok, result] = await modelBucket.invite(
      this.bucketObj.name,
      nickname
    )
    return ok ? new ResultData(result) : new ResultFault(result)
  }
  /**
   * @swagger
   *
   * /api/admin/bucket/coworker/accept:
   *   post:
   *     tags:
   *       - admin
   *     summary: 接受空间邀请
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
   *               code:
   *                 description: 邀请码。
   *                 type: string
   *               nickname:
   *                 description: 被邀请用户的昵称。
   *                 type: string
   *             required:
   *               - code
   *               - nickname
   *     responses:
   *       '200':
   *         description: result为ok
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async accept() {
    const { bucket } = this['request'].query
    if (!bucket) return new ResultFault('没有指定邀请的空间')

    const { code, nickname } = this['request'].body
    if (!code || !nickname) return new ResultFault('没有提供又有效参数')
    if (nickname !== (this['client'] && this['client'].id))
      return new ResultFault('用户信息不匹配')

    const modelBucket = new ModelBucket(
      this.mongoClient,
      this.bucketObj,
      this.client
    )
    const [ok, result] = await modelBucket.acceptInvite(
      bucket,
      code,
      nickname,
      this.client.id
    )
    return ok ? new ResultData(result) : new ResultFault(result)
  }
  /**
   * @swagger
   *
   * /api/admin/bucket/coworker/remove:
   *   get:
   *     tags:
   *       - admin
   *     summary: 删除授权访问用户
   *     security:
   *       - HeaderTokenAuth: []
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - name: coworker
   *         description: 被邀请用户的id
   *         in: query
   *         schema:
   *           type: string
   *         required: true
   *     responses:
   *       '200':
   *         description: result为ok
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async remove() {
    if (!this['bucket']) return new ResultFault('没有指定邀请的空间')

    const { coworker } = this['request'].query

    const modelBucket = new ModelBucket(
      this.mongoClient,
      this.bucketObj,
      this.client
    )
    const [ok, result] = await modelBucket.removeCoworker(
      this.bucketObj.name,
      coworker
    )
    return ok ? new ResultData(result) : new ResultFault(result)
  }
}

export default Coworker
