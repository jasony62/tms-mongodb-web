const Helper = require('./helper')
const { ModelDb, ModelCl, ModelReplicaMap } = require('../models/mgdb')

/**
 * 集合复制控制器辅助类
 * @extends Helper
 */
class ReplicaHelper extends Helper {
  /**集合复制映射关系集合 */
  get clReplicaMap() {
    const client = this.ctrl.mongoClient
    const cl = client.db('tms_admin').collection('replica_map')

    return cl
  }
  /**
   * 查找指定的数据库和集合
   *
   * @param {object} ns
   * @param {string} ns.db - 数据库名称
   * @param {string} ns.cl - 集合名称
   *
   * @returns {Array}
   */
  async findDbAndCl({ db: dbName, cl: clName }) {
    if (!dbName || typeof dbName !== 'string')
      return [false, '没有指定参数[db]']
    if (!clName || typeof clName !== 'string')
      return [false, '没有指定参数[cl]']

    const modelDb = new ModelDb(this.ctrl.bucket)
    const db = await modelDb.byName(dbName)
    if (!db) return [false, `指定的集合所属数据库[db=${dbName}]不存在`]

    const modelCl = new ModelCl(this.ctrl.bucket)
    const cl = await modelCl.byName(db, clName)
    if (!cl) return [false, `指定的集合[db=${dbName}][cl=${clName}]不存在`]

    return [true, db, cl]
  }
  /**
   * 检查请求中的复制集合映射关系参数
   *
   * @param {Object} options -
   * @param {boolean} [options.existent=false] - 检查是否存在复制映射关系
   *
   * @returns {[boolean,(string|object)]} 第1位代表是否通过了参数检查，true通过，false未通过；若未通过第2位为原因；若通过且已经建立过映射关系，第2为为已存在的复制映射关系。
   */
  async checkRequestReplicaMap({ existent = false } = {}) {
    let { primary, secondary } = this.ctrl.request.body

    const modelRM = new ModelReplicaMap(this.ctrl.mongoClient)
    let [passed, cause] = modelRM.check({
      primary,
      secondary
    })
    if (passed === false) return [false, cause]

    const modelDb = new ModelDb(this.ctrl.bucket)
    const modelCl = new ModelCl(this.ctrl.bucket)

    const priDb = await modelDb.byName(primary.db)
    if (!priDb)
      return [false, `指定的主集合所属数据库[primary.db=${primary.db}]不存在`]
    const priCl = await modelCl.byName(priDb, primary.cl)
    if (!priCl)
      return [
        false,
        `指定的主集合[primary.db=${primary.db}][primary.cl=${primary.cl}]不存在`
      ]
    if (priCl.usage === 1)
      return [
        false,
        `指定的主集合[primary.db=${primary.db}][primary.cl=${primary.cl}]的用途[usage=1]不能是从集合`
      ]

    const secDb = await modelDb.byName(secondary.db)
    if (!secDb)
      return [
        false,
        `指定的从集合所属数据库[secondary.db=${secondary.db}]不存在`
      ]
    const secCl = await modelCl.byName(secDb, secondary.cl)
    if (!secCl)
      return [
        false,
        `指定的从集合[secondary.db=${secondary.db}][secondary.cl=${secondary.cl}]不存在`
      ]
    if (secCl.usage !== 1)
      return [
        false,
        `指定的从集合[secondary.db=${secondary.db}][secondary.cl=${secondary.cl}]的用途[usage=${secCl.usage}]必须等于1`
      ]

    const beforeMap = await this.clReplicaMap.findOne({
      'primary.db': priDb.sysname,
      'primary.cl': priCl.sysname,
      'secondary.db': secDb.sysname,
      'secondary.cl': secCl.sysname
    })

    if (existent === true && !beforeMap) {
      return [
        false,
        `集合复制关系[primary.db=${primary.db}][primary.cl=${primary.cl}][secondary.db=${secondary.db}][secondary.cl=${secondary.cl}]已经存在`
      ]
    }

    return [true, beforeMap, { db: priDb, cl: priCl }, { db: secDb, cl: secCl }]
  }
  /**根据集合查询映射关系 */
  async byId(collection) {
    const {
      usage,
      sysname: clSysname,
      db: { sysname: dbSysname }
    } = collection
    let query = {}

    if (![0, 1].includes(parseInt(usage)))
      return [false, `指定了不支持的集合用途值[usage=${usage}]`]
    if (usage == 1) {
      query['secondary.db'] = dbSysname
      query['secondary.cl'] = clSysname
    } else {
      query['primary.db'] = dbSysname
      query['primary.cl'] = clSysname
    }

    const existMap = await this.clReplicaMap.findOne(query)

    if (!existMap) return [false, existMap]

    return [true, existMap]
  }
}

module.exports = ReplicaHelper
