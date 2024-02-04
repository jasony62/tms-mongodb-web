import { ObjectId } from 'mongodb'
import { ResultData, ResultFault } from 'tms-koa'
import CollectionHelper from './collectionHelper.js'
import ReplicaHelper from './replicaHelper.js'
import SchemaHelper from './schemaHelper.js'
import { ModelCl } from 'tmw-kit'
import { Base } from 'tmw-kit/dist/ctrl/index.js'

/**
 * 保存元数据的数据库
 */
const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'
/**
 * 保存元数据的集合
 */
const META_ADMIN_CL = 'mongodb_object'
const META_ADMIN_CL_BUCKET = 'bucket'

/**
 * 集合控制器基类
 * @extends Base 控制器基类
 */
class CollectionBase extends Base {
  clHelper
  rpHelper
  reqDb
  clMongoObj
  schemaHelper
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.clHelper = new CollectionHelper(this)
    this.rpHelper = new ReplicaHelper(this)
    this.schemaHelper = new SchemaHelper(this)
  }
  /**
   * 执行每个方法前执行
   */
  async tmsBeforeEach(): Promise<true | ResultFault> {
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    // 请求中指定的db
    this.reqDb = await this.clHelper.findRequestDb()

    this.clMongoObj = this.clHelper.clMongoObj

    return true
  }
  /**
   * 根据名称返回指定集合
   */
  async byName() {
    const existCl = await this.clHelper.findRequestCl()

    if (existCl.schema_id) {
      await this.clMongoObj
        .findOne({ type: 'schema', _id: new ObjectId(existCl.schema_id) })
        .then((schema) => {
          existCl.schema = schema
          delete existCl.schema_id
          return existCl
        })
    }
    return new ResultData(existCl)
  }
  /**
   * 指定库下所有的集合，包含未被管理的集合
   */
  async list() {
    const query: any = {
      type: 'collection',
      'db.sysname': this.reqDb.sysname,
    }
    if (this.client.isAdmin !== true) {
      query.adminOnly = { $ne: true }
    }
    if (this.bucketObj) query.bucket = this.bucketObj.name
    const { dirFullName, keyword } = this.request.query
    if (dirFullName) {
      query.dir_full_name = {
        $regex: new RegExp('^' + dirFullName + '(?=/|$)'),
      }
    }
    if (keyword) {
      let re = new RegExp(keyword)
      query['$or'] = [
        { name: { $regex: re, $options: 'i' } },
        { title: { $regex: re, $options: 'i' } },
        { description: { $regex: re, $options: 'i' } },
      ]
    }
    const options: any = {
      projection: { type: 0 },
    }
    let { skip, limit } = this.clHelper.requestPage()
    // 添加分页条件
    if (typeof skip === 'number') {
      options.skip = skip
      options.limit = limit
    }

    const tmwCls = await this.clMongoObj
      .find(query, options)
      .sort({ _id: -1 })
      .toArray()

    // 填充集合对应的schema信息
    const newTmwCls = await this.processCl(tmwCls)

    // 按order排序
    newTmwCls.sort((a, b) => {
      if (!a.schema_order) a.schema_order = 999999
      if (!b.schema_order) b.schema_order = 999999
      return a.schema_order - b.schema_order
    })

    if (typeof skip === 'number') {
      let total = await this.clMongoObj.countDocuments(query)
      return new ResultData({ collections: newTmwCls, total })
    }

    return new ResultData(newTmwCls)
  }
  /**
   * 指定数据库下新建集合
   */
  async create() {
    const info = this.request.body
    if (this.bucketObj) info.bucket = this.bucketObj.name
    if (!info.name) return new ResultFault('集合名称不允许为空')

    const existDb = this.reqDb
    let [flag, result] = await this.clHelper.createCl(existDb, info)

    if (!flag) {
      return new ResultFault(result)
    }

    info._id = result.insertedId

    return new ResultData(info)
  }
  /**
   * 更新集合对象信息
   * TODO 应该将数据库操作的逻辑挪到model中
   */
  async update() {
    const existCl = await this.clHelper.findRequestCl()

    let info = this.request.body
    let modelCl = new ModelCl(this.mongoClient, this.bucket, this.client)

    const result = await modelCl.update(this.reqDb, existCl, info)
    if (result[0] !== true) {
      return new ResultFault(result[1])
    }

    return new ResultData(info)
  }
  /**
   * 删除集合。如果集合中存在文档可以被删除吗？
   */
  async remove() {
    const existCl = await this.clHelper.findRequestCl()

    let { db, name: clName, usage } = existCl

    // 如果是系统自带集合不能删除
    if (
      (db.sysname === 'admin' && clName === 'system.version') ||
      (db.sysname === 'config' && clName === 'system.sessions') ||
      (db.sysname === 'local' && clName === 'startup_log') ||
      (db.sysname === META_ADMIN_DB && clName === META_ADMIN_CL) ||
      (db.sysname === META_ADMIN_DB && clName === 'tag_object') ||
      (db.sysname === META_ADMIN_DB && clName === META_ADMIN_CL_BUCKET) ||
      (db.sysname === META_ADMIN_DB && clName === 'bucket_invite_log') ||
      (db.sysname === META_ADMIN_DB && clName === 'bucket_preset_object') ||
      (db.sysname === META_ADMIN_DB && clName === 'tms_app_data_action_log') ||
      (db.sysname === META_ADMIN_DB && clName === 'replica_map')
    )
      return new ResultFault(`系统自带集合[${clName}]，不能删除`)

    if (usage !== undefined) {
      const [flag] = await this['rpHelper'].byId(existCl)
      if (flag) return new ResultFault(`该集合存在关联关系不允许删除`)
    }

    const client = this.mongoClient

    return this.clMongoObj
      .deleteOne({ _id: existCl._id })
      .then(() =>
        client
          .db(this.reqDb.sysname)
          .dropCollection(existCl.sysname)
          .catch((error) => {
            if (error.message === 'ns not found') return new ResultData('ok')
          })
      )
      .then(() => new ResultData('ok'))
      .catch((err) => new ResultFault(err.message))
  }
  /**
   * 填充集合对应的schema信息
   */
  async processCl(tmwCls) {
    const result = tmwCls.map(async (tmwCl) => {
      // 集合没有指定有效的schema_id
      if (!tmwCl.schema_id || typeof tmwCl.schema_id !== 'string') return tmwCl

      const schema_id = new ObjectId(tmwCl.schema_id)
      const schema = await this.schemaHelper.schemaById(schema_id)
      // 集合指定的schema不存在
      if (!schema) return tmwCl

      const { name, parentName, order } = schema

      tmwCl.schema_name = name
      tmwCl.schema_parentName = parentName
      tmwCl.schema_order = order

      return tmwCl
    })
    return Promise.all(result).then((newTmwCls) => {
      return newTmwCls
    })
  }
}

export default CollectionBase
