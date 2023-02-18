import CollectionBase from '../collectionBase'
import { ResultData, ResultFault } from 'tms-koa'
import { ModelCl } from 'tmw-kit'
import DocumentHelper from '../documentHelper'

class Collection extends CollectionBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * @swagger
   *
   * /api/admin/collection/byName:
   *   get:
   *     tags:
   *       - admin
   *     summary: 单个集合的完整信息
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clNameRequired'
   *     responses:
   *       '200':
   *         description: result为集合
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async byName() {
    return super.byName()
  }
  /**
   * @swagger
   *
   * /api/admin/collection/list:
   *   get:
   *     tags:
   *       - admin
   *     summary: 列出已有集合
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/page'
   *       - $ref: '#/components/parameters/size'
   *       - name: keyword
   *         description: 名称或标题包含的关键字
   *         in: query
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         description: result为集合数组。如果指定了分页参数，返回包行数据库对象的数组和符合条件的全部记录数。
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
   * /api/admin/collection/uncontrolled:
   *   get:
   *     tags:
   *       - admin
   *     summary: 列出未作为管理对象的集合
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *     responses:
   *       '200':
   *         description: result为集合数组
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseDataArray"
   */
  async uncontrolled() {
    const client = this['mongoClient']
    const rawCls = await client
      .db(this['reqDb'].sysname)
      .listCollections({}, { nameOnly: true })
      .toArray()

    let uncontrolled = []
    for (let i = 0, rawCl; i < rawCls.length; i++) {
      rawCl = rawCls[i]
      let tmwCl = await this['clMongoObj'].findOne({
        sysname: rawCl.name,
        type: 'collection',
      })
      if (!tmwCl) uncontrolled.push({ sysname: rawCl.name })
    }

    return new ResultData(uncontrolled)
  }
  /**
   * @swagger
   *
   * /api/admin/collection/create:
   *   post:
   *     tags:
   *       - admin
   *     summary: 新建集合
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
   *                 description: 集合名称。必须以英文字母开头，最长64位，不允许重名。
   *                 type: string
   *             required:
   *               - name
   *           examples:
   *             basic:
   *               summary: 基本示例
   *               value: {"name": "cl01", "title": "集合01"}
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
   * /api/admin/collection/add:
   *   post:
   *     tags:
   *       - admin
   *     summary: 将未管理集合作为管理对象
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - name: sysname
   *         description: 系统集合名称
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
   *                 description: 集合名称。必须以英文字母开头，最长64位，不允许重名。
   *                 type: string
   *             required:
   *               - name
   *           examples:
   *             basic:
   *               summary: 基本示例
   *               value: {"name": "cl01", "title": "集合01"}
   *     responses:
   *       '200':
   *         description: result为创建的集合
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async add() {
    const modelCl = new ModelCl(
      this['mongoClient'],
      this['bucket'],
      this['client']
    )

    const { sysname } = this['request'].query
    const existSysCl = await modelCl.bySysname(this['reqDb'], sysname)
    if (existSysCl)
      return new ResultFault(`集合[sysname=${sysname}]已经是管理对象`)

    const info = this['request'].body

    // 检查指定的集合名
    let [passed, cause] = modelCl.checkClName(info.name)
    if (passed === false) return new ResultFault(cause)

    // 查询是否已存在同名集合
    let existTmwCl = await modelCl.byName(this['reqDb'], info.name)
    if (existTmwCl)
      return new ResultFault(
        `数据库[name=${this['reqDb'].name}]中，已存在同名集合[name=${info.name}]`
      )

    info.type = 'collection'
    info.sysname = sysname
    info.database = this['reqDb'].name
    info.db = { sysname: this['reqDb'].sysname, name: this['reqDb'].name }
    if (this['bucket']) info.bucket = this['bucket'].name

    // 检查是否指定了用途
    let { usage } = info
    if (usage !== undefined) {
      if (![0, 1].includes(parseInt(usage)))
        return new ResultFault(`指定了不支持的集合用途值[usage=${usage}]`)
      info.usage = parseInt(usage)
    }

    return this['clMongoObj'].insertOne(info).then((result) => {
      info._id = result.insertedId
      return new ResultData(info)
    })
  }
  /**
   * @swagger
   *
   * /api/admin/collection/update:
   *   post:
   *     tags:
   *       - admin
   *     summary: 修改集合属性
   *     description: 修改集合属性，不能修改name，usage，database，bucket等字段
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clNameRequired'
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               schema_id:
   *                 description: 集合中文档对应的扩展字段定义 id。
   *                 type: string
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"title": "中文名称","description": "说明", "schema_id": "schema_01"}
   *     responses:
   *       '200':
   *         description: result为更新后的集合
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
   * /api/admin/collection/rename:
   *   get:
   *     tags:
   *       - admin
   *     summary: 更新集合名称
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clNameRequired'
   *       - name: newName
   *         description: 新集合名称
   *         in: query
   *         schema:
   *           type: string
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/ResponseOK'
   *
   */
  // async rename() {
  //   return super.rename()
  // }
  /**
   * @swagger
   *
   * /api/admin/collection/remove:
   *   get:
   *     tags:
   *       - admin
   *     summary: 删除集合
   *     description: 删除集合。不能删除系统自带集合。
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clNameRequired'
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/ResponseOK'
   *
   */
  async remove() {
    return super.remove()
  }
  /**
   * @swagger
   *
   * /api/admin/collection/discard:
   *   get:
   *     tags:
   *       - admin
   *     summary:  集合不再作为管理对象
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clNameRequired'
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/ResponseOK'
   *
   */
  async discard() {
    const existCl = await this['clHelper'].findRequestCl()

    return this['clMongoObj']
      .deleteOne({ _id: existCl._id })
      .then(() => new ResultData('ok'))
  }
}

export = Collection
