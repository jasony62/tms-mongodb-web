const ReplicaBase = require('../replicaBase')
const { ResultData, ResultFault } = require('tms-koa')
/**
 * 集合复制控制器
 * @extends ReplicaBase
 */
class Replica extends ReplicaBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * @swagger
   *
   * /api/admin/replica/list:
   *   post:
   *     tags:
   *       - admin
   *     summary: 列出已有数复制集合映射关系
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *     requestBody:
   *       description: 传递查询提交，可以只传递primary（主集合关联的所有从集合）或secondary（从集合关联的所有主集合），都传递（一对主从复制关系），或者都不传递（所有的主从复制关系）。
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               primary:
   *                 description: 主集合
   *                 type: object
   *                 properties:
   *                   db:
   *                     description: 主集合所属数据库名称
   *                     type: string
   *                   cl:
   *                     description: 主集合名称
   *                     type: string
   *                 required:
   *                   - db
   *                   - cl
   *               secondary:
   *                 description: 从集合（接收数据的集合）
   *                 type: object
   *                 properties:
   *                   db:
   *                     description: 从集合所属数据库名称
   *                     type: string
   *                   cl:
   *                     description: 从集合名称
   *                     type: string
   *                 required:
   *                   - db
   *                   - cl
   *           examples:
   *             basic:
   *               summary: 基本示例
   *               value: {"primary": {"db": "db01", "cl": "cl01"}, "secondary": {"db": "db02", "cl": "cl02"}}
   *     responses:
   *       '200':
   *         description: result为复制关系数组
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
   * /api/admin/replica/create:
   *   post:
   *     tags:
   *       - admin
   *     summary: 建立集合复制关系
   *     description: 建立集合复制关系。从集合的usage必须等于1，主集合的usaage不能等于1。
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               primary:
   *                 description: 主集合
   *                 type: object
   *                 properties:
   *                   db:
   *                     description: 主集合所属数据库名称
   *                     type: string
   *                   cl:
   *                     description: 主集合名称
   *                     type: string
   *                 required:
   *                   - db
   *                   - cl
   *               secondary:
   *                 description: 从集合（接收数据的集合）
   *                 type: object
   *                 properties:
   *                   db:
   *                     description: 从集合所属数据库名称
   *                     type: string
   *                   cl:
   *                     description: 从集合名称
   *                     type: string
   *                 required:
   *                   - db
   *                   - cl
   *             required:
   *               - primary
   *               - secondary
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"primary": {"db": "db01", "cl": "cl01"}, "secondary": {"db": "db02", "cl": "cl02"}}
   *     responses:
   *       '200':
   *         description: result为创建的复制关系
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
   * /api/admin/replica/remove:
   *   post:
   *     tags:
   *       - admin
   *     summary: 删除复制集合映射关系
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               primary:
   *                 description: 主集合
   *                 type: object
   *                 properties:
   *                   db:
   *                     description: 主集合所属数据库名称
   *                     type: string
   *                   cl:
   *                     description: 主集合名称
   *                     type: string
   *                 required:
   *                   - db
   *                   - cl
   *               secondary:
   *                 description: 从集合（接收数据的集合）
   *                 type: object
   *                 properties:
   *                   db:
   *                     description: 从集合所属数据库名称
   *                     type: string
   *                   cl:
   *                     description: 从集合名称
   *                     type: string
   *                 required:
   *                   - db
   *                   - cl
   *             required:
   *               - primary
   *               - secondary
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"primary": {"db": "db01", "cl": "cl01"}, "secondary": {"db": "db02", "cl": "cl02"}}
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
   * /api/admin/replica/synchronize:
   *   post:
   *     tags:
   *       - admin
   *     summary: 将一个集合的数据复制到另一个集合
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               primary:
   *                 description: 主集合
   *                 type: object
   *                 properties:
   *                   db:
   *                     description: 主集合所属数据库名称
   *                     type: string
   *                   cl:
   *                     description: 主集合名称
   *                     type: string
   *                 required:
   *                   - db
   *                   - cl
   *               secondary:
   *                 description: 从集合（接收数据的集合）
   *                 type: object
   *                 properties:
   *                   db:
   *                     description: 从集合所属数据库名称
   *                     type: string
   *                   cl:
   *                     description: 从集合名称
   *                     type: string
   *                 required:
   *                   - db
   *                   - cl
   *             required:
   *               - primary
   *               - secondary
   *           examples:
   *             basic:
   *               summary: 基础功能
   *               value: {"primary": {"db": "db01", "cl": "cl01"}, "secondary": {"db": "db02", "cl": "cl02"}}
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/ResponseOK'
   *
   */
  async synchronize() {
    return super.synchronize()
  }
  /**
   * @swagger
   *
   * /api/admin/replica/synchronizeAll:
   *   get:
   *     tags:
   *       - admin
   *     summary: 根据replica_map集合中的记录，执行所有的集合间同步
   *     description: 返回要执行的集合复制关系数量，复制过程在后台进行。
   *     parameters:
   *       - $ref: '#/components/parameters/bucket'
   *     responses:
   *       '200':
   *         $ref: '#/components/responses/ResponseData'
   *
   */
  async synchronizeAll() {
    return super.synchronizeAll()
  }
}

module.exports = Replica
