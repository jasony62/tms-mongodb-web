import DbBase from "../dbBase"
import { ResultData, ResultFault } from 'tms-koa'
import { ModelDb } from 'tmw-model'

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
   *     summary: 列出已有数据库
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/page'
   *       - $ref: '#/components/parameters/size'
   *       - name: keyword
   *         description: 名称或标题包含的关键字
   *         in: query
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: result为数据库数组。如果指定了分页参数，返回包行数据库对象的数组和符合条件的全部记录数。
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
   * /api/admin/db/uncontrolled:
   *   get:
   *     tags:
   *       - admin
   *     summary: 列出未管理数据库
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
  async uncontrolled() {
    const result = await this["mongoClient"]
      .db()
      .admin()
      .listDatabases({ nameOnly: true })

    let dbs = result.databases
    dbs = dbs.filter(
      ({ name }) => !['admin', 'local', 'config', 'tms_admin'].includes(name)
    )

    let uncontrolled = []
    for (let i = 0, db; i < dbs.length; i++) {
      db = dbs[i]
      let tmwDb = await this["clMongoObj"].findOne({
        sysname: db.name,
        type: 'database',
      })
      if (!tmwDb) uncontrolled.push({ sysname: db.name })
    }

    return new ResultData(uncontrolled)
  }
  /**
   * @swagger
   *
   * /api/admin/db/create:
   *   post:
   *     tags:
   *       - admin
   *     summary: 新建数据库
   *     description: 新建数据库。只有创建集合，创建数据库才生效。
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
   *               value: {"name": "db01", "title": "数据库01"}
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
   * /api/admin/db/add:
   *   post:
   *     tags:
   *       - admin
   *     summary: 将系统数据库作为管理对象
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - name: sysname
   *         description: 系统数据库名称
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
   *                 description: 数据库名称。必须以英文字母开头，最长64位，不允许重名。
   *                 type: string
   *             required:
   *               - name
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"name": "db01", "title": "数据库01"}
   *     responses:
   *       '200':
   *         description: result为创建的数据库
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async add() {
    const { sysname } = this["request"].query
    const existDb = await this["dbHelper"].dbBySysname(sysname)
    if (existDb) return new ResultFault(`数据库[${sysname}]已经作为管理对象`)

    let info = this["request"].body
    info.type = 'database'
    info.sysname = sysname
    if (this["bucket"]) info.bucket = this["bucket"].name

    // 检查数据库名
    let modelDb = new ModelDb(this["mongoClient"], this["bucket"], this["client"], this["config"])
    let newName = modelDb.checkDbName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    info.name = newName[1]

    // 查询是否存在同名库
    let existTmwDb = await this["dbHelper"].dbByName(info.name)
    if (existTmwDb)
      return new ResultFault(`已存在同名数据库[name=${info.name}]`)

    return this["clMongoObj"].insertOne(info).then((result) => {
      info._id = result.insertedId
      return new ResultData(info)
    })
  }
  /**
   * @swagger
   *
   * /api/admin/db/update:
   *   post:
   *     tags:
   *       - admin
   *     summary: 更新数据库属性信息
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
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
   *     summary: 删除数据库
   *     description:
   *       删除数据库。数据库中的集合为空才允许删除。系统自带数据库（admin，config，local，tms_admin）不允许删除。
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/ResponseOK'
   *
   */
  async remove() {
    const existDb = await this["dbHelper"].findRequestDb()

    if (['admin', 'config', 'local', 'tms_admin'].includes(existDb.sysname))
      return new ResultFault(`不能删除系统自带数据库[${existDb.sysname}]`)

    const cl = this["clMongoObj"]
    const query = { database: existDb.name, type: 'collection' }
    if (this["bucket"]) query["bucket"] = this["bucket"].name
    // 查找数据库下是否有集合，如果有则不能删除
    let colls = await cl.find(query).toArray()
    if (colls.length > 0)
      return new ResultFault(
        `删除失败，数据库[${existDb.sysname}]中存在未删除的集合`
      )

    const client = this["mongoClient"]
    return cl
      .deleteOne({ _id: existDb._id })
      .then(() => client.db(existDb.sysname).dropDatabase())
      .then(() => new ResultData('ok'))
  }
  /**
   * @swagger
   *
   * /api/admin/db/discard:
   *   get:
   *     tags:
   *       - admin
   *     summary: 数据库不再作为管理对象
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/ResponseOK'
   *
   */
  async discard() {
    const existDb = await this["dbHelper"].findRequestDb()

    if (['admin', 'config', 'local', 'tms_admin'].includes(existDb.sysname))
      return new ResultFault(`不能删除系统自带数据库[${existDb.sysname}]`)

    const cl = this["clMongoObj"]
    const query = { database: existDb.name, type: 'collection' }
    if (this["bucket"]) query["bucket"] = this["bucket"].name
    // 查找数据库下是否有集合，如果有则不能删除
    let colls = await cl.find(query).toArray()
    if (colls.length > 0)
      return new ResultFault(
        `删除失败，数据库[${existDb.sysname}]中存在未删除的集合`
      )

    return cl.deleteOne({ _id: existDb._id }).then(() => new ResultData('ok'))
  }
  /**
   * @swagger
   *
   * /api/admin/db/top:
   *   get:
   *     tags:
   *       - admin
   *     summary: 置顶数据库
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

export default Db
