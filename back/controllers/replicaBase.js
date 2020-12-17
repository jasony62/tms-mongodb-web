const { ResultData, ResultFault } = require('tms-koa')
const Base = require('./base')
const ReplicaHelper = require('./replicaHelper')

/**
 * 集合复制控制器基类
 * @extends Base 控制器基类
 */
class ReplicaBase extends Base {
  constructor(...args) {
    super(...args)
    this.replicaHelper = new ReplicaHelper(this)
  }
  /**系统调用控制器方法前执行 */
  async tmsBeforeEach() {
    // 检查是否开通了集合复制功能
    // 检查bucket
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    this.clMongoObj = this.replicaHelper.clMongoObj
    this.clReplicaMap = this.replicaHelper.clReplicaMap

    return true
  }
  /**返回映射关系列表 */
  async list() {
    const { primary, secondary } = this.request.body
    const query = {}
    if (primary && typeof primary === 'object') {
      const [
        success,
        priDbOrCause,
        priCl
      ] = await this.replicaHelper.findDbAndCl(primary)
      if (success !== true) return new ResultFault(`主集合-${priDbOrCause}`)
      query['primary.db'] = priDbOrCause.sysname
      query['primary.cl'] = priCl.sysname
    }
    if (secondary && typeof secondary === 'object') {
      const [
        success,
        secDbOrCause,
        secCl
      ] = await this.replicaHelper.findDbAndCl(secondary)
      if (success !== true) return new ResultFault(`从集合-${secDbOrCause}`)
      query['secondary.db'] = secDbOrCause.sysname
      query['secondary.cl'] = secCl.sysname
    }

    const maps = await this.clReplicaMap.find(query).toArray()
    for (let i = 0, map; i < maps.length; i++) {
      map = maps[i]
      let { _id, primary, secondary } = map
      let ts = _id.getTimestamp() * 1
      map.createTime = ts
      let priDb = await this.clMongoObj.findOne({
        sysname: primary.db,
        type: 'database'
      })
      let priCl = await this.clMongoObj.findOne({
        'db.sysname': priDb.sysname,
        sysname: primary.cl,
        type: 'collection'
      })
      if (priCl) {
        primary.db = { name: priDb.name, title: priDb.title }
        primary.cl = { name: priCl.name, title: priCl.title }
      }
      let secDb = await this.clMongoObj.findOne({
        sysname: secondary.db,
        type: 'database'
      })
      let secCl = await this.clMongoObj.findOne({
        'db.sysname': secDb.sysname,
        sysname: secondary.cl,
        type: 'collection'
      })
      if (secCl) {
        secondary.db = { name: secDb.name, title: secDb.title }
        secondary.cl = { name: secCl.name, title: secCl.title }
      }
      delete map._id
    }

    return new ResultData(maps)
  }
  /**
   * 建立映射关系
   *
   * 两个集合都必须是用户创建的结合。从集合的usage必须等于1。
   *
   * @returns {object} 创建的复制关系对象
   */
  async create() {
    const [
      passed,
      causeOrBefore,
      pri,
      sec
    ] = await this.replicaHelper.checkRequestReplicaMap()
    if (passed !== true) return new ResultFault(causeOrBefore)

    if (causeOrBefore) {
      let { primary, secondary } = this.request.body
      return new ResultFault(
        `不允许重复建立集合复制关系[primary.db=${primary.db}][primary.cl=${primary.cl}][secondary.db=${secondary.db}][secondary.cl=${secondary.cl}]`
      )
    }
    /**
     * 建立复制关系
     */
    const replicaMap = {
      primary: { db: pri.db.sysname, cl: pri.cl.sysname },
      secondary: { db: sec.db.sysname, cl: sec.cl.sysname }
    }
    return this.clReplicaMap
      .insertOne(replicaMap)
      .then(result => new ResultData(result.ops[0]))
  }
  /**删除映射关系 */
  async remove() {
    const [
      passed,
      causeOrBefore
    ] = await this.replicaHelper.checkRequestReplicaMap({ existent: true })
    if (passed !== true) return new ResultFault(causeOrBefore)

    return this.clReplicaMap
      .deleteOne({ _id: causeOrBefore._id })
      .then(() => new ResultData('ok'))
  }
  /**将一个集合的数据复制到另一个集合 */
  async synchronize() {
    const [
      passed,
      causeOrBefore,
      pri,
      sec
    ] = await this.replicaHelper.checkRequestReplicaMap({ existent: true })
    if (passed !== true) return new ResultFault(causeOrBefore)

    const priSysCl = this.replicaHelper.findSysColl(pri.cl)
    const secSysCl = this.replicaHelper.findSysColl(sec.cl)

    let deleted // 删除的记录数量
    const total = await priSysCl.countDocuments()
    if (total) {
      let { limit } = this.request.query
      limit = limit === undefined ? 10 : parseInt(limit)
      const syncAt = Date.now()
      // 同步数据
      for (let remainder = total; remainder; ) {
        let docs = await priSysCl.find({}, { limit }).toArray()
        for (let i = 0, l = docs.length; i < l; i++) {
          let { _id, ...doc } = docs[i]
          doc.__pri = {
            db: pri.db.sysname,
            cl: pri.cl.sysname,
            id: _id,
            time: syncAt
          }
          secSysCl.replaceOne({ '__pri.id': _id }, doc, { upsert: true })
        }
        remainder -= docs.length
      }
      // 清除删除的数据
      deleted = await secSysCl
        .deleteMany({
          '__pri.db': pri.db.sysname,
          '__pri.cl': pri.cl.sysname,
          '__pri.time': { $not: { $eq: syncAt } }
        })
        .then(({ deletedCount }) => deletedCount)
    }

    return new ResultData({ replaced: total, deleted })
  }
}

module.exports = ReplicaBase
