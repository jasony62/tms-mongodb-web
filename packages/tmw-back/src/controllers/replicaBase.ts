const log4js = require('log4js')
const logger = log4js.getLogger('tms-mongodb-web')

const { ResultData, ResultFault } = require('tms-koa')

import Base from './base'
import ReplicaHelper from './replicaHelper'

import { ModelReplicaMap } from 'tmw-model'

/**
 * 集合复制控制器基类
 * @extends Base 控制器基类
 */
export class ReplicaBase extends Base {
  constructor(...args) {
    super(...args)
    this.replicaHelper = new ReplicaHelper(this)
    this.modelReplicaMap = new ModelReplicaMap(this.mongoClient)
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
      const [success, priDbOrCause, priCl] =
        await this.replicaHelper.findDbAndCl(primary)
      if (success !== true) return new ResultFault(`主集合-${priDbOrCause}`)
      query['primary.db'] = priDbOrCause.sysname
      query['primary.cl'] = priCl.sysname
    }
    if (secondary && typeof secondary === 'object') {
      const [success, secDbOrCause, secCl] =
        await this.replicaHelper.findDbAndCl(secondary)
      if (success !== true) return new ResultFault(`从集合-${secDbOrCause}`)
      query['secondary.db'] = secDbOrCause.sysname
      query['secondary.cl'] = secCl.sysname
    }

    const options: any = {
      projection: { type: 0 },
      sort: { top: -1 },
    }
    let { skip, limit } = this.replicaHelper.requestPage()
    // 添加分页条件
    if (typeof skip === 'number') {
      options.skip = skip
      options.limit = limit
    }

    const maps = await this.clReplicaMap.find(query, options).toArray()
    for (let i = 0, map; i < maps.length; i++) {
      map = maps[i]
      let { _id, primary, secondary } = map
      let ts = _id.getTimestamp() * 1
      map.createTime = ts
      let priDb = await this.clMongoObj.findOne({
        sysname: primary.db,
        type: 'database',
      })
      let priCl = await this.clMongoObj.findOne({
        'db.sysname': priDb.sysname,
        sysname: primary.cl,
        type: 'collection',
      })
      if (priCl) {
        primary.db = { name: priDb.name, title: priDb.title }
        primary.cl = { name: priCl.name, title: priCl.title }
      }
      let secDb = await this.clMongoObj.findOne({
        sysname: secondary.db,
        type: 'database',
      })
      let secCl = await this.clMongoObj.findOne({
        'db.sysname': secDb.sysname,
        sysname: secondary.cl,
        type: 'collection',
      })
      if (secCl) {
        secondary.db = { name: secDb.name, title: secDb.title }
        secondary.cl = { name: secCl.name, title: secCl.title }
      }
      delete map._id
    }

    if (typeof skip === 'number') {
      let total = await this.clReplicaMap.countDocuments(query)
      return new ResultData({ replicas: maps, total })
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
    const [passed, causeOrBefore, pri, sec] =
      await this.replicaHelper.checkRequestReplicaMap()
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
      secondary: { db: sec.db.sysname, cl: sec.cl.sysname },
    }
    return this.clReplicaMap
      .insertOne(replicaMap)
      .then((result) => new ResultData(result))
  }
  /**删除映射关系 */
  async remove() {
    const [passed, causeOrBefore] =
      await this.replicaHelper.checkRequestReplicaMap({ existent: true })
    if (passed !== true) return new ResultFault(causeOrBefore)

    return this.clReplicaMap
      .deleteOne({ _id: causeOrBefore._id })
      .then(() => new ResultData('ok'))
  }
  /**将一个集合的数据复制到另一个集合 */
  async synchronize() {
    const [passed, causeOrBefore] =
      await this.replicaHelper.checkRequestReplicaMap({ existent: true })
    if (passed !== true) return new ResultFault(causeOrBefore)

    let { primary, secondary } = causeOrBefore
    let result = await this.modelReplicaMap.synchronize(primary, secondary)

    return new ResultData(result)
  }
  /**根据replica_map集合中的记录，执行所有的集合间同步 */
  async synchronizeAll() {
    const count = await this.clReplicaMap.countDocuments()
    if (count === 0)
      return new ResultFault('没有配置集合间复制关系，未执行集合同步操作')

    // 后台执行
    setTimeout(() => {
      logger.info(`启动后台执行集合复制关系同步count=${count}]`)
      const cp = require('child_process')
      const child = cp.fork('./replica/synchronize.js')
      child.on('message', (msg) => {
        logger.info(`结束后台执行集合复制关系同步[syncCount=${msg.syncCount}]`)
      })
    })

    return new ResultData(count)
  }
}

export default ReplicaBase
