const DbBase = require('../dbBase')
const { ResultData, ResultFault } = require('tms-koa')
const ObjectId = require('mongodb').ObjectId

class Db extends DbBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * @swagger
   *
   * /api/admin/db/list:
   *   get:
   *     tags:
   *       - admin
   *     description:
   *       列出已有数据库
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *     responses:
   *       '200':
   *         description: result为数据库数组
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
   * /api/admin/db/create:
   *   post:
   *     tags:
   *       - admin
   *     description:
   *       新建数据库。只有创建集合，创建数据库才生效。
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 description: 数据库名称。必须以英文字母开头，最长64位，不允许重名。
   *                 type: string
   *             required:
   *               - name
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"name": "db01"}
   *     responses:
   *       '200':
   *         description: result为创建的数据库
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
   * /api/admin/db/update:
   *   post:
   *     tags:
   *       - admin
   *     description:
   *       更新数据库属性信息。
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbName'
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 description: 数据库名称。必须以英文字母开头，最长64位，不允许重名。
   *                 type: string
   *             required:
   *               - name
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"name": "db01"}
   *     responses:
   *       '200':
   *         description: result为更新后的数据库
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async update() {
    return super.update()
  }
  /**
   * @swagger
   *
   * /api/admin/db/remove:
   *   get:
   *     tags:
   *       - admin
   *     description:
   *       删除数据库。数据库中的集合为空才允许删除。系统自带数据库（admin，config，local，tms_admin）不允许删除。
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbName'
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/ResponseOK'
   *
   */
  async remove() {
    const existDb = await this.dbHelper.findRequestDb()

    if (['admin', 'config', 'local', 'tms_admin'].includes(existDb.sysname))
      return new ResultFault('不能删除系统自带数据库')

    const cl = this.clMongoObj
    const query = { database: existDb.name, type: 'collection' }
    if (this.bucket) query.bucket = this.bucket.name
    // 查找数据库下是否有集合，如果有则不能删除
    let colls = await cl.find(query).toArray()
    if (colls.length > 0)
      return new ResultFault('删除失败，此库中存在未删除的集合')

    const client = this.mongoClient
    return cl
      .deleteOne({ _id: ObjectId(existDb._id) })
      .then(() => client.db(existDb.name).dropDatabase())
      .then(() => new ResultData('ok'))
  }
  /**
   * @swagger
   *
   * /api/admin/db/top:
   *   get:
   *     tags:
   *       - admin
   *     description:
   *       置顶数据库。
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - name: id
   *         description: 数据库id（应该改为用数据库名）
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *       - name: type
   *         description: 是否置顶（逻辑有问题）
   *         in: query
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
  async top() {
    return super.top()
  }
}
module.exports = Db
