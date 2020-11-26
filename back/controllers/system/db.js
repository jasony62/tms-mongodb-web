const { ResultData, ResultFault } = require('tms-koa')
const ObjectId = require('mongodb').ObjectId
const Base = require('./base')
const modelDb = require('../../models/mgdb/db')

/** 预制数据库 */
class Db extends Base {
  constructor(...args) {
    super(...args)
  }
  /**
   * @swagger
   *
   * /api/system/db/create:
   *   post:
   *     tags:
   *       - system
   *     description:
   *       创建预制数据库
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 description: 预制数据库名称。必须以英文字母开头，最长64位，不允许重名。
   *                 type: string
   *             required:
   *               - name
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"name": "db01"}
   *             name_invalid:
   *               summary: 命名不符合规则
   *               value: {"name": "预制数据库01"}
   *     responses:
   *       '200':
   *         description: result为创建的预制数据库
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async create() {
    let info = this.request.body
    info.type = 'database'

    // 检查数据库名
    let model = new modelDb()
    let newName = model._checkDbName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    info.name = newName[1]

    // 查询是否存在同名库
    let existDb = await this.helper.dbByName(info.name)
    if (existDb) return new ResultFault('已存在同名预制数据库')

    return this.clPreset
      .insertOne(info)
      .then((result) => new ResultData(result.ops[0]))
  }
  /**
   * @swagger
   *
   * /api/system/db/update:
   *   post:
   *     tags:
   *       - system
   *     description:
   *       更改预制数据库
   *     parameters:
   *       - name: db
   *         description: 预制数据库名称
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
   *               name:
   *                 description: 预制数据库名称
   *                 type: string
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"name": "db02"}
   *     responses:
   *       '200':
   *         description: result为更新后的预制数据库
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async update() {
    const beforeDb = await this.helper.findRequestDb()

    let info = this.request.body
    let { _id, ...updatedInfo } = info

    let existDb = await this.helper.dbByName(info.name)
    if (existDb) return new ResultFault('已存在同名预制数据库')

    const query = { _id: ObjectId(beforeDb._id) }

    return this.clPreset
      .updateOne(query, { $set: updatedInfo })
      .then(() => new ResultData(info))
  }
  /**
   * @swagger
   *
   * /api/system/db/remove:
   *   get:
   *     tags:
   *       - system
   *     description:
   *       删除预制数据库
   *     parameters:
   *       - name: db
   *         description: 预制数据库名称
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
    const existDb = await this.helper.findRequestDb()

    const cl = this.clPreset

    // 查找数据库下是否有集合，如果有则不能删除
    const query = { database: existDb.name, type: 'collection' }
    let colls = await cl.find(query).toArray()
    if (colls.length > 0)
      return new ResultFault('删除失败，此库中存在未删除的集合')

    return cl
      .deleteOne({ _id: ObjectId(existDb._id) })
      .then(() => new ResultData('ok'))
  }
  /**
   * @swagger
   *
   * /api/system/db/list:
   *   get:
   *     tags:
   *       - system
   *     description:
   *       列出已有预制数据库
   *     responses:
   *       '200':
   *         description: result为预制数据库数组
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async list() {
    const query = { type: 'database' }
    const tmsDbs = await this.clPreset
      .find(query, { projection: { _id: 0, type: 0 } })
      .toArray()

    return new ResultData(tmsDbs)
  }
}
module.exports = Db
