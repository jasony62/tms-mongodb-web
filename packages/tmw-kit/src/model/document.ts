import mongodb from 'mongodb'
import Base from './base.js'
import ModelColl from './collection.js'
import ModelSchema from './schema.js'
import ModelAcl from './acl.js'
import dayjs from 'dayjs'
import { ElasticSearchIndex } from '../elasticsearch/index.js'
import Debug from 'debug'

const debug = Debug('tmw-kit:model:document')

const ObjectId = mongodb.ObjectId

/**
 * 保存元数据的数据库
 */
const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'
/**
 * 用update代替delete操作
 * 添加删除时间
 */
const UPDATE_AS_DELETE = /true|yes/i.test(process.env.TMW_APP_UPDATE_AS_DELETE)
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
/**
 *
 * @param tmwCl
 * @returns
 */
function esAvailable(tmwCl): boolean {
  return (
    ElasticSearchIndex.available() &&
    tmwCl.custom?.elasticsearch?.enabled === true
  )
}
/**文档模型类基类 */
class Document extends Base {
  get _modelCl() {
    const modelCl = new ModelColl(this.mongoClient, this.bucket, this.client)
    return modelCl
  }

  get _modelAcl() {
    const model = new ModelAcl(this.mongoClient, this.bucket, this.client)
    return model
  }
  /**
   *
   * @param dbSysname
   * @param clSysName
   * @returns
   */
  private _getSysCl(dbSysname: string, clSysName) {
    let mongoClient = this.mongoClient
    let sysCl = mongoClient.db(dbSysname).collection(clSysName)
    return sysCl
  }
  /**
   * 获得指定id的文档
   * @param {object} existCl - 文档所在集合
   * @param {string} id - 文档id
   * @param {object} projection - 显示哪些列
   *
   * @returns {object} 文档对象
   */
  async byId(existCl, id, projection = null) {
    const sysCl = this._getSysCl(existCl.db.sysname, existCl.sysname)

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
    const sysCl = this._getSysCl(existCl.db.sysname, existCl.sysname)

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
   * @param {object} tmwCl - 文档对象所在集合
   * @param {string} id - 文档对象id
   *
   * @throws 如果不满足删除条件，抛出异常说明原因
   *
   * @returns {boolean} 是否更新成功
   */
  async remove(tmwCl, id): Promise<boolean> {
    let sysCl = this._getSysCl(tmwCl.db.sysname, tmwCl.sysname)

    const removeQuery = { _id: new ObjectId(id) }

    let deletedCount
    if (UPDATE_AS_DELETE) {
      const current = dayjs().format('YYYY-MM-DD HH:mm:ss')
      const result = await sysCl.updateOne(removeQuery, {
        $set: { [this.tmwConfig.TMW_APP_DELETETIME]: current },
      })
      deletedCount = result.modifiedCount
    } else {
      const result = await sysCl.deleteOne(removeQuery)
      deletedCount = result.deletedCount
    }

    if (deletedCount) {
      // 操作日志？
      // 从es中删除文档
      if (esAvailable(tmwCl)) {
        const esIndex = newEsIndex(tmwCl)
        await esIndex.removeDocument(id)
      }
    }

    return deletedCount === 1
  }
  /**
   * 按条件批量删除文档
   *
   * 如果删除的是从集合中的数据，改为删除主集合中的数据，从集合的数据等复制机制进行更新
   *
   * @param {object} tmwCl - 文档对象所在集合
   * @param {object} query - 文档查询条件
   *
   * @throws 如果不满足删除条件，抛出异常说明原因
   *
   * @returns {number} 删除的文档数量
   */
  async removeMany(tmwCl, query) {
    const sysCl = this._getSysCl(tmwCl.db.sysname, tmwCl.sysname)

    const removedDocs = await sysCl
      .find(query, { projection: { _id: 1 } })
      .toArray()

    if (removedDocs.length === 0) return 0

    let deletedCount
    if (UPDATE_AS_DELETE) {
      const current = dayjs().format('YYYY-MM-DD HH:mm:ss')
      const result = await sysCl.updateMany(query, {
        $set: { [this.tmwConfig.TMW_APP_DELETETIME]: current },
      })
      deletedCount = result.modifiedCount
    } else {
      const result = await sysCl.deleteMany(query)
      deletedCount = result.deletedCount
    }

    if (deletedCount) {
      // 从es中删除文档
      if (esAvailable(tmwCl)) {
        const esIndex = newEsIndex(tmwCl)
        const promises = removedDocs.map(({ _id }) => {
          return esIndex.removeDocument(_id.toString())
        })
        await Promise.all(promises)
      }
    }

    return deletedCount
  }
  /**
   * 按条件批量复制文档
   *
   * 保留原文档的id，如果id重复进行替换
   *
   * @param {object} tmwCl - 文档对象所在集合
   * @param {object} query - 文档查询条件
   * @param {object} targetCl - 目标集合
   *
   * @returns {number} 复制的文档数量
   */
  async copyMany(tmwCl, query, targetCl) {
    const sourceSysCl = this._getSysCl(tmwCl.db.sysname, tmwCl.sysname)

    let copyedDocs = await sourceSysCl.find(query).toArray()
    if (copyedDocs.length === 0) return 0

    const targetSysCl = this._getSysCl(targetCl.db.sysname, targetCl.sysname)

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
   *
   * @param existCl
   * @param data
   * @param schema
   */
  async create(existCl, data: any) {
    let sysCl = this._getSysCl(existCl.db.sysname, existCl.sysname)

    // 对象的创建人
    data.creator = this.client.id

    const newDoc = await sysCl.insertOne(data).then(async (r) => {
      // 记录操作日志
      // await this.dataActionLog(r.ops, '创建', existCl.db.name, existCl.name)
      return data
    })

    // 提交到es
    if (esAvailable(existCl)) {
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
    const sysCl = this._getSysCl(dbName, clName)

    // 对象的创建人
    rows.forEach((row) => (row.creator = this.client.id))

    const rst = await sysCl.insertMany(rows).then(async ({ insertedIds }) => {
      // await this.dataActionLog(r.ops, '创建', dbName, clName)
      rows.forEach(async (row, index) => {
        row._id = insertedIds[`${index}`]
        // 提交到es
        if (esAvailable(tmwCl)) {
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
    const sysCl = this._getSysCl(existCl.db.sysname, existCl.sysname)
    let ops = {}
    if (updated && typeof updated === 'object' && Object.keys(updated).length)
      ops['$set'] = updated
    if (removed && typeof removed === 'object' && Object.keys(removed).length)
      ops['$unset'] = removed
    return sysCl
      .updateOne({ _id: new ObjectId(id) }, ops)
      .then(async ({ modifiedCount }) => {
        // 提交到es
        if (esAvailable(existCl)) {
          const esIndex = newEsIndex(existCl)
          await esIndex.updateDocument(id, updated)
        }
        return modifiedCount === 1
      })
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
    let sysCl = this._getSysCl(existCl.db.sysname, existCl.sysname)
    return sysCl
      .updateMany(query, { $set: updated })
      .then(({ modifiedCount }) => modifiedCount)
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
    const replaceOne = async (sysCl) => {
      return sysCl
        .replaceOne({ _id: new ObjectId(id) }, newDoc)
        .then(async ({ modifiedCount }) => {
          // 提交到es
          if (esAvailable(existCl)) {
            const esIndex = newEsIndex(existCl)
            await esIndex.updateDocument(id, newDoc)
          }
          return modifiedCount === 1
        })
    }
    const sysCl = this._getSysCl(existCl.db.sysname, existCl.sysname)
    return await replaceOne(sysCl)
  }
  /**
   * 模糊搜索数据
   * @param {object} tmwCl
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
    tmwCl,
    { filter = null, orderBy = null } = {},
    { page = 0, size = 0 } = {},
    like = true,
    projection = null,
    includeDeleted = false
  ): Promise<[boolean, string | { docs: any[]; total: number }]> {
    if (!tmwCl) return [false, '没有指定存在的集合']
    // 筛选条件
    const query: any = filter ? this.assembleQuery(filter, like) : {}

    // 排除已删除数据
    if (UPDATE_AS_DELETE && includeDeleted !== true) {
      query[this.tmwConfig.TMW_APP_DELETETIME] = { $exists: false }
    }

    // 数据权限，管理员不受限制
    if (this.client.isAdmin !== true) {
      // 集合中的文档要通过acl控制访问权限
      if (tmwCl.docAclCheck === true) {
        let queryAclCheck: any = [
          { creator: { $eq: this.client.id } }, // 创建人允许访问
        ]
        // 获得当前用户在acl列表中授权访问的数据库
        const aclResult = await this._modelAcl.targetByUser(
          { type: 'document' },
          { id: this.client.id }
        )
        if (Array.isArray(aclResult.document) && aclResult.document.length) {
          const queryAcl = aclResult.document.map((id) => new ObjectId(id))
          queryAclCheck.push({ _id: { $in: queryAcl } })
        }
        query.$or = queryAclCheck
      }
    }

    // 分页
    const { skip, limit } = this.toSkipAndLimit(page, size)

    // 排序
    const sort = {}
    if (orderBy && typeof orderBy === 'object' && Object.keys(orderBy).length) {
      for (const key in orderBy) sort[key] = orderBy[key] === 'desc' ? -1 : 1
    } else {
      sort['_id'] = -1
    }

    const sysCl = this._getSysCl(tmwCl.db.sysname, tmwCl.sysname)

    const docs = await sysCl
      .find(query)
      .project(projection)
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .toArray()
      .then(async (docs) => {
        return docs
      })

    const total = await sysCl.countDocuments(query)

    return [true, { docs, total }]
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

    const cl = this._getSysCl(existCl.db.sysname, existCl.sysname)

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
    const sysCl = this._getSysCl(existCl.db.sysname, existCl.sysname)

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
    if (dbname === META_ADMIN_DB && clname === 'tms_app_data_action_log')
      return false

    // 避免改变原数据
    let datas = JSON.parse(JSON.stringify(oDatas))

    if (!Array.isArray(datas)) {
      let dArr = []
      dArr.push(datas)
      datas = dArr
    }

    const client = this.mongoClient
    const cl = client.db(META_ADMIN_DB)

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
    const clSchemas = await this._modelCl.getSchemaByCollection(existCl)
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
  async getDocumentByIds(tmwCl, ids, fields = {}) {
    if (!tmwCl || !ids) {
      return [false, '参数不完整']
    }
    const sysCl = this._getSysCl(tmwCl.db.sysname, tmwCl.sysname)

    let docIds = ids.map((id) => new ObjectId(id))
    let find = { _id: { $in: docIds } }

    // 获取表列
    return sysCl
      .find(find)
      .project(fields)
      .toArray()
      .then((rst) => [true, rst])
      .catch((err) => [false, err.toString()])
  }
  /**
   * 获得文档列定义
   *
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
