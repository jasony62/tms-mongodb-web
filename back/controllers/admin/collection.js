const CollectionBase = require('../collectionBase')

class Collection extends CollectionBase {
  constructor(...args) {
    super(...args)
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
   *     responses:
   *       '200':
   *         description: result为集合数组
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
   *               summary: 基础功能
   *               value: {"name": "cl01"}
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
   * /api/admin/collection/update:
   *   post:
   *     tags:
   *       - admin
   *     summary: 修改集合属性
   *     description: 修改集合属性，不能修改name，usage，database，bucket等字段
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clName'
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
   *       - $ref: '#/components/parameters/dbName'
   *       - $ref: '#/components/parameters/clName'
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
  async rename() {
    return super.rename()
  }
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
}

module.exports = Collection
