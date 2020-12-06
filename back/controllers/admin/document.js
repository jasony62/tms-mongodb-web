const { ResultData } = require('tms-koa')
const DocBase = require('../documentBase')

/** 管理段文档对象控制器 */
class Document extends DocBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * @swagger
   *
   * /api/admin/document/list:
   *   post:
   *     tags:
   *       - admin
   *     summary: 列出已有文档
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clNameRequired'
   *       - name: page
   *         in: query
   *         description: 分页条件，起始页
   *         schema:
   *           type: integer
   *       - name: size
   *         in: query
   *         description: 分页条件，每页包含的文档数
   *         schema:
   *           type: integer
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               filter:
   *                 description: 什么逻辑？
   *                 type: string
   *               orderBy:
   *                 description: 什么逻辑？
   *                 type: string
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"filter": "", "orderBy": ""}
   *     responses:
   *       '200':
   *         description: result为符合条件的文档数组
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
   * /api/admin/document/create:
   *   post:
   *     tags:
   *       - admin
   *     summary: 新建文档
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clNameRequired'
   *     requestBody:
   *       description: 和文档列定义一致的文档数据。
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {}
   *     responses:
   *       '200':
   *         description: result为创建的文档
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
   * /api/admin/document/update:
   *   post:
   *     tags:
   *       - admin
   *     summary: 新建文档
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clNameRequired'
   *       - $ref: '#/components/parameters/docId'
   *     requestBody:
   *       description: 和文档列定义一致的文档数据。
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {}
   *     responses:
   *       '200':
   *         description: result为的更新后文档
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
   * /api/admin/document/updateMany:
   *   post:
   *     tags:
   *       - admin
   *     summary: 批量更新文档（代码有问题）
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clNameRequired'
   *     requestBody:
   *       description: 和文档列定义一致的文档数据。
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *           examples:
   *             basic:
   *               summary: 基本示例
   *               value: {"docIds": [], "filter": {}, "columns": {}}
   *     responses:
   *       '200':
   *         description: result为???
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async updateMany() {
    return super.updateMany()
  }
  /**
   * @swagger
   *
   * /api/admin/document/remove:
   *   get:
   *     tags:
   *       - admin
   *     summary: 根据指定id，删除文档
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clNameRequired'
   *       - $ref: '#/components/parameters/docId'
   *     responses:
   *       '200':
   *         description: result为???
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async remove() {
    return super.remove()
  }
  /**
   * @swagger
   *
   * /api/admin/document/removeMany:
   *   post:
   *     tags:
   *       - admin
   *     summary: 批量删除文档
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clNameRequired'
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *           examples:
   *             basic:
   *               summary: 基本示例
   *               value: {"docIds": [], "filter": {}}
   *     responses:
   *       '200':
   *         description: result为???
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async removeMany() {
    return super.removeMany()
  }
  /**
   * @swagger
   *
   * /api/admin/document/getGroupByColumnVal:
   *   post:
   *     tags:
   *       - admin
   *     summary: 根据某一列的值分组
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clNameRequired'
   *       - name: column
   *         in: query
   *         description: 指定的列
   *         schema:
   *           type: string
   *       - name: page
   *         in: query
   *         description: 分页条件，起始页
   *         schema:
   *           type: integer
   *       - name: size
   *         in: query
   *         description: 分页条件，每页包含的文档数
   *         schema:
   *           type: integer
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *           examples:
   *             basic:
   *               summary: 基本示例
   *               value: {"filter": {}}
   *     responses:
   *       '200':
   *         description: result为???
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async getGroupByColumnVal() {
    return super.getGroupByColumnVal()
  }
  /**
   * @swagger
   *
   * /api/admin/document/getDocCompleteStatusById:
   *   post:
   *     tags:
   *       - admin
   *     summary: 根据某一列的值分组
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *       - $ref: '#/components/parameters/dbNameRequired'
   *       - $ref: '#/components/parameters/clNameRequired'
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *           examples:
   *             basic:
   *               summary: 基本示例
   *               value: {"docIds": []}
   *     responses:
   *       '200':
   *         description: result为???
   *         content:
   *           application/json:
   *             schema:
   *               "$ref": "#/components/schemas/ResponseData"
   */
  async getDocCompleteStatusById() {
    return super.getDocCompleteStatusById()
  }
}
module.exports = Document
