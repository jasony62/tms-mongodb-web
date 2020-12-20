const ObjectId = require('mongodb').ObjectId
const Base = require('./base')
const ModelColl = require('./collection')
const moment = require('moment')
const APPCONTEXT = require('tms-koa').Context.AppContext
const TMWCONFIG = APPCONTEXT.insSync().appConfig.tmwConfig

/**文档模型类基类 */
class Document extends Base {
  /**
   * 获得指定id的文档
   * @param {object} existCl - 文档所在集合
   * @param {string} id - 文档id
   *
   * @returns {object} 文档对象
   */
  async byId(existCl, id) {
    let mongoClient = await this.mongoClient()
    let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname)
    let existDoc = await sysCl.findOne({
      _id: ObjectId(id),
    })

    return existDoc
  }
  /**
   * 删除指定id的文档
   *
   * 如果删除的是从集合中的数据，改为删除主集合中的数据
   *
   * @param {object} existCl - 文档对象所在集合
   * @param {string} id - 文档对象id
   *
   * @throws 如果不满足删除条件，抛出异常说明原因
   *
   * @returns {boolean} 是否更新成功
   */
  async remove(existCl, id) {
    let mongoClient = await this.mongoClient()
    let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname)
    const modelCl = new ModelColl(this.bucket)

    if (existCl.usage !== 1) {
      /**主集合删除文档 */
      let removeQuery = { _id: ObjectId(id) }
      await modelCl.checkRemoveConstraint(existCl, removeQuery, sysCl)
      return sysCl.deleteOne(removeQuery).then(({ result }) => result.n === 1)
    } else {
      /**检查要删除的文档是否存在 */
      let doc = await sysCl.findOne({ _id: ObjectId(id) })
      if (!doc) return false

      /**从集合转到主集合删除 */
      let { __pri } = doc
      let priCl = mongoClient.db(__pri.db).collection(__pri.cl)
      let existPriCl = await modelCl.bySysname({ sysname: __pri.db }, __pri.cl)
      let removeQuery = { _id: __pri.id }
      await modelCl.checkRemoveConstraint(existPriCl, removeQuery, priCl)

      return priCl.deleteOne(removeQuery).then(({ result }) => result.n === 1)
    }
  }
  /**
   * 按条件批量删除文档
   *
   * 如果删除的是从集合中的数据，改为删除主集合中的数据，从集合的数据等复制机制进行更新
   *
   * @param {object} existCl - 文档对象所在集合
   * @param {object} query - 文档查询条件
   *
   * @throws 如果不满足删除条件，抛出异常说明原因
   *
   * @returns {number} 删除的文档数量
   */
  async removeMany(existCl, query) {
    let mongoClient = await this.mongoClient()
    let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname)
    const modelCl = new ModelColl(this.bucket)

    if (existCl.usage !== 1) {
      await modelCl.checkRemoveConstraint(existCl, query, sysCl)
      return sysCl.deleteMany(query).then(({ deletedCount }) => deletedCount)
    } else {
      let removedDocs = await sysCl
        .find(query, { projection: { __pri: 1 } })
        .toArray()
      if (removedDocs.length === 0) return 0

      let priIdsByCl = new Map() // 按文档所属集合对文档的id分组记录
      removedDocs.forEach(({ __pri }) => {
        let priDbDotCl = `${__pri.db}.${__pri.cl}`
        if (!priIdsByCl.has(priDbDotCl)) priIdsByCl.set(priDbDotCl, [])
        priIdsByCl.get(priDbDotCl).push(__pri.id)
      })

      /**检查是否符合删除约束条件 */
      for (const entry of priIdsByCl) {
        let [dbDotCl, ids] = entry
        let [db, cl] = dbDotCl.split('.')
        let sysCl = mongoClient.db(db).collection(cl)
        let tmwCl = await modelCl.bySysname({ sysname: db }, cl)
        await modelCl.checkRemoveConstraint(tmwCl, { _id: { $in: ids } }, sysCl)
      }

      let promises = [] // 每个主集合中删除文档的promise
      priIdsByCl.forEach((ids, dbDotCl) => {
        let [db, cl] = dbDotCl.split('.')
        promises.push(
          mongoClient
            .db(db)
            .collection(cl)
            .deleteMany({ _id: { $in: ids } })
            .then(({ deletedCount }) => deletedCount)
        )
      })

      return Promise.all(promises).then((deletedCounts) =>
        deletedCounts.reduce((total, deletedCount) => total + deletedCount, 0)
      )
    }
  }
  /**
   * 按条件批量复制文档
   *
   * 保留原文档的id，如果id重复进行替换
   *
   * @param {object} existCl - 文档对象所在集合
   * @param {object} query - 文档查询条件
   * @param {object} targetCl - 目标集合
   *
   * @returns {number} 复制的文档数量
   */
  async copyMany(existCl, query, targetCl) {
    let mongoClient = await this.mongoClient()
    let existSysCl = mongoClient
      .db(existCl.db.sysname)
      .collection(existCl.sysname)

    let copyedDocs = await existSysCl.find(query).toArray()
    if (copyedDocs.length === 0) return 0

    let targetSysCl = mongoClient
      .db(targetCl.db.sysname)
      .collection(targetCl.sysname)

    let bulkOp = targetSysCl.initializeUnorderedBulkOp()
    copyedDocs.forEach((doc) => {
      bulkOp.find({ _id: doc._id }).upsert().updateOne({
        $setOnInsert: doc,
      })
    })

    return bulkOp.execute().then(({ nUpserted, nMatched, nModified }) => {
      return { nUpserted, nMatched, nModified }
    })
  }
  /**
   * 更新指定id的文档
   *
   * 如果更新的是从集合中的数据，改为更新主集合中的数据
   *
   * @param {object} existCl - 文档对象所在集合
   * @param {string} id - 文档对象id
   * @param {object} updated - 更新的数据
   *
   * @returns {boolean} 是否更新成功
   */
  async update(existCl, id, updated) {
    let mongoClient = await this.mongoClient()
    if (existCl.usage !== 1) {
      let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname)
      return sysCl
        .updateOne(
          {
            _id: ObjectId(id),
          },
          { $set: updated }
        )
        .then(({ modifiedCount }) => modifiedCount === 1)
    } else {
      let doc = await existCl.findOne({ _id: ObjectId(id) })
      if (!doc) return false
      let { __pri } = doc
      let priCl = mongoClient.db(__pri.db).collection(__pri.cl)
      return priCl
        .updateOne({ _id: __pri.id }, { $set: updated })
        .then(({ modifiedCount }) => modifiedCount === 1)
    }
  }
  /**
   * 按条件批量更新文档
   *
   * 如果更新的是从集合中的数据，改为更新主集合中的数据，从集合的数据等复制机制进行更新
   *
   * @param {object} existCl - 文档对象所在集合
   * @param {object} query - 文档查询条件
   * @param {object} updated - 更新的数据
   *
   * @returns {number} 更新的文档数量
   */
  async updateMany(existCl, query, updated) {
    let mongoClient = await this.mongoClient()
    let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname)
    if (existCl.usage !== 1) {
      return sysCl
        .updateMany(query, { $set: updated })
        .then(({ modifiedCount }) => modifiedCount)
    } else {
      let updatedDocs = await sysCl
        .find(query, { projection: { __pri: 1 } })
        .toArray()
      if (updatedDocs.length === 0) return 0

      let priIdsByCl = new Map() // 按文档所属集合对文档的id分组记录
      updatedDocs.forEach(({ __pri }) => {
        let priDbDotCl = `${__pri.db}.${__pri.cl}`
        if (!priIdsByCl.has(priDbDotCl)) priIdsByCl.set(priDbDotCl, [])
        priIdsByCl.get(priDbDotCl).push(__pri.id)
      })

      let promises = [] // 每个主集合中更新文档的promise
      priIdsByCl.forEach((ids, dbDotCl) => {
        let [db, cl] = dbDotCl.split('.')
        promises.push(
          mongoClient
            .db(db)
            .collection(cl)
            .updateMany({ _id: { $in: ids } }, { $set: updated })
            .then(({ modifiedCount }) => modifiedCount)
        )
      })

      return Promise.all(promises).then((modifiedCounts) =>
        modifiedCounts.reduce(
          (total, modifiedCount) => total + modifiedCount,
          0
        )
      )
    }
  }
  /**
   * 模糊搜索数据
   * @param {object} existCl
   * @param {object} [options={}]
   * @param {object} [options.filter]
   * @param {object} [options.orderBy]
   * @param {object} [page={}]
   * @param {number} [page.page]
   * @param {number} [page.size]
   * @param {boolean} [like=true]
   *
   * @returns {[]}
   */
  async list(
    existCl,
    { filter, orderBy } = {},
    { page, size } = {},
    like = true
  ) {
    let query = filter ? this.assembleQuery(filter, like) : {}

    const client = await this.mongoClient()
    let cl = client.db(existCl.db.sysname).collection(existCl.sysname)

    // 分页
    let { skip, limit } = this.toSkipAndLimit(page, size)

    // 排序
    let sort = {}
    if (orderBy && typeof orderBy === 'object' && Object.keys(orderBy).length) {
      for (const key in orderBy) sort[key] = orderBy[key] === 'desc' ? -1 : 1
    } else {
      sort._id = -1
    }

    let data = {}
    data.docs = await cl
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .toArray()
      .then(async (docs) => {
        await this.getDocCompleteStatus(existCl, docs)
        return docs
      })

    data.total = await cl.find(query).count()

    return [true, data]
  }
  /**
   * 根据指定的id数组，获得文档列表
   * @param {object} existCl - 文档所在集合
   * @param {string[]} ids - 文档id数组
   * @param {object} [fields={}] - 要显示的列
   *
   * @returns {[]} 第1位：是否成功，第2位：错误信息或文档列表
   */
  async byIds(existCl, ids, fields = {}) {
    if (!existCl || !ids) return [false, '参数不完整']

    let docIds = ids.map((id) => new ObjectId(id))
    let query = { _id: { $in: docIds } }

    const client = await this.mongoClient()
    const cl = client.db(existCl.db.sysname).collection(existCl.sysname)

    return cl
      .find(query)
      .project(fields)
      .toArray()
      .then((rst) => [true, rst])
      .catch((err) => [false, err.toString()])
  }
  /**
   * 获得符合条件的文档数量
   * @param {object} existCl - 文档所在集合
   * @param {object} query - 筛选条件
   *
   * @returns {number} 文档数量
   */
  async count(existCl, query) {
    const client = await this.mongoClient()
    const sysCl = client.db(existCl.db.sysname).collection(existCl.sysname)

    let total = await sysCl.countDocuments(query)

    return total
  }
  /**
   * 记录数据操作日志
   */
  async dataActionLog(
    oDatas,
    operate_type,
    dbname,
    clname,
    operate_after_dbname = '',
    operate_after_clname = '',
    operate_before_data = ''
  ) {
    if (!operate_type || !dbname || !clname) return false
    if (TMWCONFIG.TMS_APP_DATA_ACTION_LOG !== 'Y') return true
    if (dbname === 'tms_admin' && clname === 'tms_app_data_action_log')
      return false

    // 避免改变原数据
    let datas = JSON.parse(JSON.stringify(oDatas))

    if (!Array.isArray(datas)) {
      let dArr = []
      dArr.push(datas)
      datas = dArr
    }

    const client = await this.mongoClient()
    const cl = client.db('tms_admin')
    // 插入日志表中
    let today = moment()
    let current = today.format('YYYY-MM-DD HH:mm:ss')
    const cl2 = cl.collection('tms_app_data_action_log')
    if (operate_before_data && Array.isArray(operate_before_data)) {
      let newDatas = {}
      operate_before_data.forEach((od) => {
        newDatas[od._id] = od
      })
      operate_before_data = newDatas
    }
    //
    for (const data of datas) {
      if (data._id) {
        data.operate_id = data._id
        delete data._id
      } else {
        data.operate_id = ''
      }
      data.operate_dbname = dbname
      data.operate_clname = clname
      data.operate_after_dbname = operate_after_dbname
      data.operate_after_clname = operate_after_clname
      data.operate_time = current
      data.operate_type = operate_type
      // 旧数据
      if (operate_before_data) {
        if (
          typeof operate_before_data === 'object' &&
          operate_before_data[data.operate_id]
        ) {
          data.operate_before_data = JSON.stringify(
            operate_before_data[data.operate_id]
          )
        } else if (typeof operate_before_data === 'string') {
          data.operate_before_data = operate_before_data
        }
      } else {
        data.operate_before_data = ''
      }

      await cl2.insertOne(data)
    }

    return true
  }
  /**
   * 查询文档完成情况
   */
  async getDocCompleteStatus(existCl, docs) {
    const modelCl = new ModelColl(this.bucket)
    const clSchemas = await modelCl.getSchemaByCollection(existCl)
    if (!clSchemas) return docs
    //
    docs.forEach((doc) => {
      let status = {
        unCompleted: {},
        completed: {},
      }
      for (const k in clSchemas) {
        const v = clSchemas[k]
        if (v.required === true) {
          // 必填
          if ([undefined, '', null].includes(doc[k])) status.unCompleted[k] = v
          else status.completed[k] = v
        } else status.completed[k] = v
      }
      doc.completeStatus = status
    })

    return docs
  }
}

module.exports = Document
