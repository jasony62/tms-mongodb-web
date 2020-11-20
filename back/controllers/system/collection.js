const { ResultData, ResultFault, ResultObjectNotFound } = require('tms-koa')
const Base = require('./base')

/** 预计集合 */
class Collection extends Base {
  constructor(...args) {
    super(...args)
  }
  /**
   * @swagger
   *
   * /api/system/collection/create:
   *   post:
   *     tags:
   *       - system
   *     description:
   *       新建预制集合对象信息
   *     parameters:
   *       - name: db
   *         description: 指定预制数据库名称
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
   *                 description: 预制集合名称。
   *                 type: string
   *                 required: true
   *               title:
   *                 description: 预制集合中文标题。
   *                 type: string
   *                 required: true
   *               description:
   *                 description: 预制集合说明。
   *                 type: string
   *               schema_id:
   *                 description: 集合中文档对应的json-schema定义。
   *                 type: string
   *     responses:
   *       '200':
   *         description: result为创建的预制集合
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async create() {
    const existDb = await this.helper.findRequestDb()

    const info = this.request.body

    // 检查集合名
    let newName = this.helper.checkClName(info.name)
    if (newName[0] === false) return new ResultFault(newName[1])
    info.name = newName[1]

    // 查询是否存在同名集合
    let existCol = await this.helper.colByName(existDb.name, info.name)
    if (existCol) return new ResultFault('指定数据库中已存在同名预制集合')

    info.type = 'collection'
    info.database = existDb.name

    return this.clPreset
      .insertOne(info)
      .then((result) => new ResultData(result.ops[0]))
  }
  /**
   * @swagger
   *
   * /api/system/collection/update:
   *   post:
   *     tags:
   *       - system
   *     description:
   *       更新预制集合对象信息
   *     parameters:
   *       - name: db
   *         description: 指定预制数据库名称
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
   *                 description: 预制集合名称。
   *                 type: string
   *                 required: true
   *               title:
   *                 description: 预制集合中文标题。
   *                 type: string
   *                 required: true
   *               description:
   *                 description: 预制集合说明。
   *                 type: string
   *                 required: true
   *               schema_id:
   *                 description: 集合中文档对应的json-schema定义。
   *                 type: string
   *     responses:
   *       '200':
   *         description: result为更新的预制集合
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async update() {
    const existDb = await this.helper.findRequestDb()

    let { cl: clName } = this.request.query
    let info = this.request.body

    // 格式化集合名
    let newClName = this.helper.checkClName(info.name)
    if (newClName[0] === false) return new ResultFault(newClName[1])
    newClName = newClName[1]

    // 检查是否已存在同名集合
    if (newClName !== clName) {
      // 查询是否存在同名集合
      let existCol = await this.helper.colByName(existDb.name, info.name)
      if (existCol) return new ResultData('已存在同名集合，不允许修改集合名称')
      else info.name = newClName
    } else {
      delete info.name
    }

    const query = { database: existDb.name, name: clName, type: 'collection' }
    const { _id, database, type, ...updatedInfo } = info

    const rst = await this.clPreset
      .updateOne(query, { $set: updatedInfo }, { upsert: true })
      .then((rst) => [true, rst.result])
      .catch((err) => [false, err.message])

    if (rst[0] === false) return new ResultFault(rst[1])

    return new ResultData(info)
  }
  /**
   * @swagger
   *
   * /api/system/collection/remove:
   *   get:
   *     tags:
   *       - system
   *     description:
   *       删除指定名称的预制集合
   *     parameters:
   *       - name: db
   *         description: 指定预制数据库名称
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *       - name: cl
   *         description: 指定预制集合名称
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

    let { cl: clName } = this.request.query

    const query = { database: existDb.name, name: clName, type: 'collection' }

    return this.clPreset.deleteOne(query).then(() => new ResultData('ok'))
  }
  /**
   * @swagger
   *
   * /api/system/collection/byName:
   *   get:
   *     tags:
   *       - system
   *     description:
   *       返回指定名称的预制集合
   *     parameters:
   *       - name: db
   *         description: 指定预制数据库名称
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *       - name: cl
   *         description: 指定预制集合名称
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: result为符合条件预制集合
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async byName() {
    const existDb = await this.helper.findRequestDb()

    const { cl: clName } = this.request.query
    const query = { database: existDb.name, name: clName, type: 'collection' }

    return this.clPreset
      .findOne(query, { projection: { _id: 0, type: 0 } })
      .then((myCl) => {
        if (myCl && myCl.schema_id) {
          return this.clPreset
            .findOne({ type: 'schema', _id: new ObjectId(myCl.schema_id) })
            .then((schema) => {
              myCl.schema = schema
              delete myCl.schema_id
              return myCl
            })
        }
        return myCl
      })
      .then((myCl) =>
        myCl ? new ResultData(myCl) : new ResultObjectNotFound()
      )
  }
  /**
   * @swagger
   *
   * /api/system/collection/list:
   *   get:
   *     tags:
   *       - system
   *     description:
   *       列出指定预制库下所有预制集合
   *     parameters:
   *       - name: db
   *         description: 指定预制数据库名称
   *         in: query
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: result为预制集合数组
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async list() {
    const existDb = await this.helper.findRequestDb()

    const query = { type: 'collection', database: existDb.name }
    const tmsCls = await this.clPreset
      .find(query, { projection: { _id: 0, type: 0, database: 0 } })
      .toArray()

    return new ResultData(tmsCls)
  }
}

module.exports = Collection
