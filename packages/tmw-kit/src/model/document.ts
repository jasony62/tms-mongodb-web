import mongodb from 'mongodb'
import Base from './base.js'
import ModelColl from './collection.js'
import ModelSchema from './schema.js'
import dayjs from 'dayjs'
import { ElasticSearchIndex } from '../elasticsearch/index.js'
import Debug from 'debug'

const debug = Debug('tmw-kit:model:document')

const ObjectId = mongodb.ObjectId

/**
 * 创建ES索引实例
 *
 * @param tmwCl
 * @returns
 */
function newEsIndex(tmwCl) {
  let indexName = `${tmwCl.db.sysname}+${tmwCl.sysname}`
  return new ElasticSearchIndex(indexName)
}

/**文档模型类基类 */
class Document extends Base {
  /**
   * 获得指定id的文档
   * @param {object} existCl - 文档所在集合
   * @param {string} id - 文档id
   * @param {object} projection - 显示哪些列
   *
   * @returns {object} 文档对象
   */
  async byId(existCl, id, projection = null) {
    let mongoClient = this.mongoClient
    let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname)

    let options: any = {}
    if (projection && typeof projection === 'object')
      options.projection = projection

    let existDoc = await sysCl.findOne(
      {
        _id: new ObjectId(id),
      },
      options
    )

    return existDoc
  }
  /**
   * 获得指定查找条件的文档
   * @param {object} existCl - 文档所在集合
   * @param {object} {filter, like} - 查找条件
   * @param {object} projection - 显示哪些列
   *
   * @returns {object} 文档对象
   */
  async findOne(existCl, { filter, like = false }, projection = null) {
    let mongoClient = this.mongoClient
    let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname)

    let options: any = {}
    if (projection && typeof projection === 'object')
      options.projection = projection

    let query = filter ? this.assembleQuery(filter, like) : {}

    let existDoc = await sysCl.findOne(query, options)

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
    let mongoClient = this.mongoClient
    let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname)
    const modelCl = new ModelColl(this.mongoClient, this.bucket, this.client)
    let removeQuery, removeSysCl

    if (existCl.usage !== 1) {
      /**主集合删除文档 */
      removeSysCl = sysCl
      removeQuery = { _id: new ObjectId(id) }
      await modelCl.checkRemoveConstraint(existCl, removeQuery, sysCl)
    } else {
      /**检查要删除的文档是否存在 */
      let doc = await sysCl.findOne({ _id: new ObjectId(id) })
      if (!doc) return false

      /**从集合转到主集合删除 */
      let { __pri } = doc
      let priCl = mongoClient.db(__pri.db).collection(__pri.cl)
      let existPriCl = await modelCl.bySysname({ sysname: __pri.db }, __pri.cl)
      removeQuery = { _id: __pri.id }
      await modelCl.checkRemoveConstraint(existPriCl, removeQuery, priCl)
      removeSysCl = priCl
    }

    const result = this.findUnRepeatRule(existCl)
    if (result[0] && result[1]['insert']) {
      const dbSysName = result[1]['dbSysName']
      const clSysName = result[1]['clSysName']
      const keys = result[1]['keys']
      const { targetSysCl, targetQuery } = await this.getUnRepeatSQ(
        removeSysCl,
        removeQuery,
        dbSysName,
        clSysName,
        keys
      )
      targetSysCl.deleteMany(targetQuery)
    }

    return removeSysCl.deleteOne(removeQuery).then(async ({ deletedCount }) => {
      // 操作日志？
      // 从es中删除文档
      if (ElasticSearchIndex.available()) {
        const esIndex = newEsIndex(existCl)
        await esIndex.removeDocument(id)
      }
      return deletedCount === 1
    })
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
    const mongoClient = this.mongoClient
    const sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname)
    const removedDocs = await sysCl
      .find(query, { projection: { _id: 1 } })
      .toArray()
    if (removedDocs.length === 0) return 0

    const modelCl = new ModelColl(this.mongoClient, this.bucket, this.client)

    if (existCl.usage !== 1) {
      const result = this.findUnRepeatRule(existCl)
      if (result[0] && result[1]['insert']) {
        const dbSysName = result[1]['dbSysName']
        const clSysName = result[1]['clSysName']
        const keys = result[1]['keys']
        const { targetSysCl, targetQuery } = await this.getUnRepeatSQ(
          sysCl,
          query,
          dbSysName,
          clSysName,
          keys
        )
        targetSysCl.deleteMany(targetQuery)
      }
      await modelCl.checkRemoveConstraint(existCl, query, sysCl)
      const { deletedCount } = await sysCl.deleteMany(query)
      // 从es中删除文档
      if (ElasticSearchIndex.available()) {
        const esIndex = newEsIndex(existCl)
        const promises = removedDocs.map(({ _id }) => {
          return esIndex.removeDocument(_id.toString())
        })
        await Promise.all(promises)
      }
      return deletedCount
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
        const result = this.findUnRepeatRule(tmwCl)

        if (result[0]['flag'] && 'insert') {
          const dbSysName = result[1]['dbSysName']
          const clSysName = result[1]['clSysName']
          const keys = result[1]['keys']
          const insert = result[1]['insert']
          const { targetSysCl, targetQuery } = await this.getUnRepeatSQ(
            sysCl,
            { _id: { $in: ids } },
            dbSysName,
            clSysName,
            keys
          )
          targetSysCl.deleteMany(targetQuery)
        }
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
    let mongoClient = this.mongoClient
    let existSysCl = mongoClient
      .db(existCl.db.sysname)
      .collection(existCl.sysname)

    let copyedDocs = await existSysCl.find(query).toArray()
    if (copyedDocs.length === 0) return 0

    let targetSysCl = mongoClient
      .db(targetCl.db.sysname)
      .collection(targetCl.sysname)

    let bulkOp = targetSysCl.initializeUnorderedBulkOp()
    let { tmwConfig } = this
    for (let doc of copyedDocs) {
      let { _id, ...info } = doc
      typeof info[tmwConfig.TMW_APP_CREATETIME] !== 'undefined' &&
        delete info[tmwConfig.TMW_APP_UPDATETIME]
      typeof info[tmwConfig.TMW_APP_UPDATETIME] !== 'undefined' &&
        delete info[tmwConfig.TMW_APP_CREATETIME]
      let isExistDoc = await targetSysCl.findOne({ _id: doc._id })
      if (isExistDoc) {
        this.processBeforeStore(info, 'update')
        bulkOp.find({ _id: doc._id }).updateOne({ $set: info })
      } else {
        this.processBeforeStore(info, 'insert')
        bulkOp.find({ _id: doc._id }).upsert().updateOne({
          $setOnInsert: info,
        })
      }
    }

    return bulkOp.execute().then(({ nUpserted, nMatched, nModified }) => {
      return { nUpserted, nMatched, nModified }
    })
  }
  /**
   * 新建文档
   * @param existCl
   * @param data
   * @param schema
   */
  async create(existCl, data: any) {
    let mongoClient = this.mongoClient
    let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname)

    const newDoc = await sysCl.insertOne(data).then(async (r) => {
      // 记录操作日志
      await this.dataActionLog(r.ops, '创建', existCl.db.name, existCl.name)
      return data
    })

    // 提交到es
    if (ElasticSearchIndex.available()) {
      const esIndex = newEsIndex(existCl)
      await esIndex.createDocument(newDoc._id.toString(), newDoc)
    }

    return newDoc
  }
  /**
   * 批量添加文档
   * @param tmwCl
   * @param rows
   * @returns
   */
  async createMany(tmwCl, rows: any[]) {
    const dbName = tmwCl.db.sysname
    const clName = tmwCl.sysname
    const sysCl = this.mongoClient.db(dbName).collection(clName)

    const rst = await sysCl.insertMany(rows).then(async ({ insertedIds }) => {
      // await this.dataActionLog(r.ops, '创建', dbName, clName)
      rows.forEach(async (row, index) => {
        row._id = insertedIds[`${index}`]
        // 提交到es
        if (ElasticSearchIndex.available()) {
          const esIndex = newEsIndex(tmwCl)
          await esIndex.createDocument(row._id.toString(), row)
        }
      })
      return rows
    })

    return rst
  }
  /**
   * 更新指定id的文档
   *
   * 如果更新的是从集合中的数据，改为更新主集合中的数据
   *
   * @param {object} existCl - 文档对象所在集合
   * @param {string} id - 文档对象id
   * @param {object} updated - 更新的数据
   * @param {object} removed - 清除的数据
   *
   * @returns {boolean} 是否更新成功
   */
  async update(existCl, id: string, updated: any, removed?: any) {
    let mongoClient = this.mongoClient
    let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname)
    if (existCl.usage !== 1) {
      let ops = {}
      if (updated && typeof updated === 'object' && Object.keys(updated).length)
        ops['$set'] = updated
      if (removed && typeof removed === 'object' && Object.keys(removed).length)
        ops['$unset'] = removed
      return sysCl
        .updateOne({ _id: new ObjectId(id) }, ops)
        .then(async ({ modifiedCount }) => {
          // 提交到es
          if (ElasticSearchIndex.available()) {
            const esIndex = newEsIndex(existCl)
            await esIndex.updateDocument(id, updated)
          }
          return modifiedCount === 1
        })
    } else {
      let __pri
      if (updated.__pri) {
        __pri = updated.__pri
      } else {
        let doc = await sysCl.findOne({ _id: new ObjectId(id) })
        if (!doc) return false
        __pri = doc.__pri
      }
      let priCl = mongoClient.db(__pri.db).collection(__pri.cl)
      return priCl
        .updateOne({ _id: new ObjectId(__pri.id) }, { $set: updated })
        .then(async ({ modifiedCount }) => {
          // 操作日志？
          // 提交到es
          if (ElasticSearchIndex.available()) {
            const esIndex = newEsIndex(existCl)
            await esIndex.updateDocument(id, updated)
          }
          return modifiedCount === 1
        })
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
    let mongoClient = this.mongoClient
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
   * 替换指定id的文档
   *
   * 如果更新的是从集合中的数据，改为更新主集合中的数据
   *
   * @param {object} existCl - 文档对象所在集合
   * @param {string} id - 文档对象id
   * @param {object} newDoc - 替换的数据
   *
   * @returns {boolean} 是否替换成功
   */
  async replace(existCl, id: string, newDoc: any) {
    let mongoClient = this.mongoClient
    const replaceOne = async (sysCl) => {
      return sysCl
        .replaceOne({ _id: new ObjectId(id) }, newDoc)
        .then(async ({ modifiedCount }) => {
          // 提交到es
          if (ElasticSearchIndex.available()) {
            const esIndex = newEsIndex(existCl)
            await esIndex.updateDocument(id, newDoc)
          }
          return modifiedCount === 1
        })
    }
    let sysCl = mongoClient.db(existCl.db.sysname).collection(existCl.sysname)
    if (existCl.usage !== 1) {
      return await replaceOne(sysCl)
    } else {
      let __pri
      if (newDoc.__pri) {
        __pri = newDoc.__pri
      } else {
        let doc = await sysCl.findOne({ _id: new ObjectId(id) })
        if (!doc) return false
        __pri = doc.__pri
      }
      let priCl = mongoClient.db(__pri.db).collection(__pri.cl)
      return await replaceOne(priCl)
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
    { filter = null, orderBy = null } = {},
    { page = 0, size = 0 } = {},
    like = true,
    projection = null
  ) {
    if (!existCl) return [false, '没有指定存在的集合']

    let query = filter ? this.assembleQuery(filter, like) : {}

    const client = this.mongoClient
    let cl = client.db(existCl.db.sysname).collection(existCl.sysname)

    // 分页
    let { skip, limit } = this.toSkipAndLimit(page, size)

    // 排序
    let sort = {}
    if (orderBy && typeof orderBy === 'object' && Object.keys(orderBy).length) {
      for (const key in orderBy) sort[key] = orderBy[key] === 'desc' ? -1 : 1
    } else {
      sort['_id'] = -1
    }

    let data: any = {}
    data.docs = await cl
      .find(query)
      .project(projection)
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .toArray()
      .then(async (docs) => {
        return docs
      })

    data.total = await cl.countDocuments(query)

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

    const client = this.mongoClient
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
    const client = this.mongoClient
    const sysCl = client.db(existCl.db.sysname).collection(existCl.sysname)

    let total = await sysCl.countDocuments(query)

    return total
  }
  /**
   * 记录数据操作日志
   *
   * @param oDatas
   * @param operate_type
   * @param dbname
   * @param clname
   * @param operate_after_dbname
   * @param operate_after_clname
   * @param operate_before_data
   * @param client_info
   * @returns
   */
  async dataActionLog(
    oDatas,
    operate_type,
    dbname,
    clname,
    operate_after_dbname = '',
    operate_after_clname = '',
    operate_before_data = null,
    client_info = null
  ) {
    if (!operate_type || !dbname || !clname) return false
    if (this.tmwConfig.TMW_APP_DATA_ACTION_LOG !== 'Y') return true
    if (dbname === 'tms_admin' && clname === 'tms_app_data_action_log')
      return false

    // 避免改变原数据
    let datas = JSON.parse(JSON.stringify(oDatas))

    if (!Array.isArray(datas)) {
      let dArr = []
      dArr.push(datas)
      datas = dArr
    }

    const client = this.mongoClient
    const cl = client.db('tms_admin')
    // 插入日志表中
    let current = dayjs().format('YYYY-MM-DD HH:mm:ss')
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
      /*本地客户端时读取用户信息*/
      if (this.client && this.client.data) {
        data.operate_account =
          this.client.data.account || this.client.data['cust_id']
        data.operate_nickname = this.client.data.nickname
      }
      /*第三方调用时读取用户信息*/
      if (client_info) {
        data.operate_account =
          client_info.operate_account || client_info['cust_id']
        data.operate_nickname = client_info.operate_nickname
      }
      // 旧数据
      if (operate_before_data) {
        if (
          typeof operate_before_data === 'object' &&
          operate_before_data[data.operate_id]
        ) {
          data.operate_before_data = operate_before_data[data.operate_id]
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
    const modelCl = new ModelColl(this.mongoClient, this.bucket, this.client)
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
  /**
   * 查询旧文档
   */
  async getDocumentByIds(oldExistCl, ids, fields = {}) {
    if (!oldExistCl || !ids) {
      return [false, '参数不完整']
    }
    const client = this.mongoClient
    const cl = client.db(oldExistCl.db.sysname).collection(oldExistCl.sysname)

    let docIds = []
    ids.forEach((id) => {
      docIds.push(new ObjectId(id))
    })
    let find = { _id: { $in: docIds } }

    // 获取表列
    return cl
      .find(find)
      .project(fields)
      .toArray()
      .then((rst) => [true, rst])
      .catch((err) => [false, err.toString()])
  }
  /**
   * 检查集合中是否有去重规则
   * @param {object} existCl - 文档所在集合
   *
   */
  findUnRepeatRule(existCl) {
    const { operateRules } = existCl
    if (
      operateRules &&
      operateRules.scope &&
      operateRules.unrepeat &&
      operateRules.unrepeat.database &&
      operateRules.unrepeat.database.sysname
    ) {
      const {
        database: { sysname: dbSysName, name: dbName },
        collection: { sysname: clSysName, name: clName },
        primaryKeys: keys,
        insert,
      } = operateRules.unrepeat
      return [true, { dbSysName, dbName, clSysName, clName, keys, insert }]
    } else {
      return [
        false,
        {
          dbSysName: null,
          dbName: null,
          clSysName: null,
          clName: null,
          keys: null,
          insert: false,
        },
      ]
    }
  }
  /**
   * 获得去重规则系统对象和条件
   * @param {object} existSysCl - 删除操作文档所在集合
   * @param {object} query - 删除操作的查询条件
   * @param {object} db - 去重规则库
   * @param {object} cl - 去重规则表
   * @param {arary} keys - 去重规则主键
   *
   */
  async getUnRepeatSQ(existSysCl, query, db, cl, keys) {
    let mongoClient = this.mongoClient
    let targetSysCl = mongoClient.db(db).collection(cl)

    const docs = await existSysCl.find(query).toArray()
    let targetQuery = {}
    keys.forEach((key) => {
      let result = []
      docs.forEach((doc) => result.push(doc[key]))
      targetQuery[key] = { $in: result }
    })
    return { targetSysCl, targetQuery }
  }
  /**
   * 获得文档列定义
   * @param schemaId
   */
  async getDocSchema(schemaId: string) {
    const modelSchema = new ModelSchema(
      this.mongoClient,
      this.bucket,
      this.client
    )

    // 集合的schema定义
    let schema
    if (schemaId && typeof schemaId === 'string')
      schema = await modelSchema.bySchemaId(schemaId)

    return schema
  }
}

export default Document
