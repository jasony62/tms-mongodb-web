const MONGODB_CLIENT = Symbol('mongodb_client')

/**集合间复制关系 */
class ReplicaMap {
  constructor(dbClient) {
    this[MONGODB_CLIENT] = dbClient
  }
  get dbClient() {
    return this[MONGODB_CLIENT]
  }
  /**
   * 检查单个集合复制关系数据是否合规
   * @param {object} replicaMap - 集合复制关系
   *
   * @returns {[boolean,string]} 是否合规，第1位是否通过检查；若未通过，第2位给出原因。
   */
  check(replicaMap) {
    if (!replicaMap || typeof replicaMap !== 'object')
      return [false, '集合复制关系为空或者类型不是对象']
    let { primary, secondary } = replicaMap
    if (!primary || typeof primary !== 'object')
      return [false, '[primary]为空或者类型不是对象']
    if (!secondary || typeof secondary !== 'object')
      return [false, '[secondary]为空或者类型不是对象']
    {
      let { db, cl } = primary
      if (!db || typeof db !== 'string')
        return [false, '[primary.db]为空或者类型不是对象']
      if (!cl || typeof cl !== 'string')
        return [false, '[primary.cl]为空或者类型不是对象']
    }
    {
      let { db, cl } = secondary
      if (!db || typeof db !== 'string')
        return [false, '[secondary.db]为空或者类型不是对象']
      if (!cl || typeof cl !== 'string')
        return [false, '[secondary.db]为空或者类型不是对象']
    }

    return [true]
  }
  /**
   * 将一个集合的数据复制到另一个集合
   * @param {object} pri
   * @param {object} sec
   */
  async synchronize(pri, sec, limits) {
    let dbClient = this.dbClient
    const priSysCl = dbClient.db(pri.db).collection(pri.cl)
    const secSysCl = dbClient.db(sec.db).collection(sec.cl)

    let deletedCount // 删除的记录数量
    const syncAt = Date.now()
    // 同步集合中的数据
    const replacedCount = await priSysCl.countDocuments()
    if (replacedCount) {
      let limit
      if (limits) {
        limit = limits.limit
        limit = limit === undefined ? 10 : parseInt(limit)
      }
      // 同步数据
      let skip = 0
      for (let remainder = replacedCount; remainder; ) {
        let docs = await priSysCl.find({}, { skip, limit }).toArray()
        for (let i = 0, l = docs.length; i < l; i++) {
          let { _id, ...doc } = docs[i]
          doc.__pri = {
            db: pri.db,
            cl: pri.cl,
            id: _id,
            time: syncAt
          }
          await secSysCl.replaceOne({ '__pri.id': _id }, doc, { upsert: true })
        }
        remainder -= docs.length
        skip += docs.length
      }
    }
    // 清除删除的数据
    deletedCount = await secSysCl
      .deleteMany({
        '__pri.db': pri.db,
        '__pri.cl': pri.cl,
        '__pri.time': { $not: { $eq: syncAt } }
      })
      .then(({ deletedCount }) => deletedCount)

    return { replacedCount, deletedCount }
  }
}

export default ReplicaMap