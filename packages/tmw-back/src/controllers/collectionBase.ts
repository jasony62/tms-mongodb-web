import mongodb from 'mongodb'
import { ResultData, ResultFault } from 'tms-koa'
import CollectionHelper from './collectionHelper.js'
import ReplicaHelper from './replicaHelper.js'
import SchemaHelper from './schemaHelper.js'
import { ModelCl, ModelSchema } from 'tmw-kit'
import { Base } from 'tmw-kit/dist/ctrl/index.js'
import { ElasticSearchIndex } from 'tmw-kit/dist/elasticsearch/index.js'
import { SchemaIter } from 'tmw-kit/dist/schema.js'

const ObjectId = mongodb.ObjectId

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
  async tmsBeforeEach() {
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
    if (this.bucketObj) query.bucket = this.bucketObj.name
    const { keyword } = this.request.query
    if (keyword) {
      let re = new RegExp(keyword)
      query['$or'] = [
        { name: { $regex: re, $options: 'i' } },
        { title: { $regex: re, $options: 'i' } },
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
   * TODO 临时方法，与document中的代码重复，应该重构
   * @param schema_id
   */
  private async getDocSchema(schema_id) {
    const modelSchema = new ModelSchema(
      this.mongoClient,
      this.bucket,
      this.client
    )

    // 集合的schema定义
    let docSchema
    if (schema_id && typeof schema_id === 'string')
      docSchema = await modelSchema.bySchemaId(schema_id)

    return docSchema
  }
  /**
   * 更新集合对象信息
   * TODO 应该将数据库操作的逻辑挪到model中
   */
  async update() {
    const existCl = await this.clHelper.findRequestCl()

    let info = this.request.body
    let modelCl = new ModelCl(this['mongoClient'], this.bucket, this['client'])

    // 格式化集合名
    let newClName
    if (info.name !== undefined && info.name !== existCl.name) {
      newClName = modelCl.checkClName(info.name)
      if (newClName[0] === false) return new ResultFault(newClName[1])
      // 查询是否已存在同名集合
      let existTmwCl = await modelCl.byName(this.reqDb, info.name)
      if (existTmwCl)
        return new ResultFault(
          `数据库[name=${this.reqDb.name}]中，已存在同名集合[name=${info.name}]`
        )
    }

    // 查询是否已存在同名集合
    if (newClName) {
      let otherCl = await modelCl.byName(this.reqDb, newClName)
      if (otherCl)
        return new ResultFault(
          `数据库[name=${this.reqDb.name}]中，已存在同名集合[name=${newClName}]`
        )
    }

    const { _id, sysname, database, db, type, bucket, usage, ...updatedInfo } =
      info

    // 需要清除的字段。应该考虑根据schema做清除。
    const cleaned = { children: '' }

    const rst = await this.clMongoObj
      .updateOne({ _id: existCl._id }, { $set: updatedInfo, $unset: cleaned })
      .then((rst) => [true, rst.result])
      .catch((err) => [false, err.message])

    if (rst[0] === false) return new ResultFault(rst[1])

    // 更新es索引
    const { schema_id } = existCl
    if (schema_id && typeof schema_id === 'string') {
      if (updatedInfo?.custom?.elasticsearch?.enabled === true) {
        if (ElasticSearchIndex.available()) {
          const indexName = `${existCl.db.sysname}+${existCl.sysname}`
          const esIndex = new ElasticSearchIndex(indexName)

          // 集合的文档字段定义
          let docSchema = await this.getDocSchema(schema_id)
          if (docSchema) {
            /**所有密码格式的属性都需要加密存储*/
            const schemaIter = new SchemaIter({
              type: 'object',
              properties: docSchema,
            })
            const analyzer = ElasticSearchIndex.analyzer()
            const properties: any = {}
            for (let schemaProp of schemaIter) {
              let { fullname, attrs } = schemaProp
              if (attrs.format === 'longtext') {
                Object.assign(properties, {
                  [fullname]: { type: 'text', analyzer },
                })
              }
            }
            if (Object.keys(properties).length) {
              const config = { mappings: { properties } }
              await esIndex.configure(config)
            }
          }
        }
      }
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
      (db.sysname === 'tms_admin' && clName === 'mongodb_object') ||
      (db.sysname === 'tms_admin' && clName === 'bucket') ||
      (db.sysname === 'tms_admin' && clName === 'bucket_invite_log') ||
      (db.sysname === 'tms_admin' && clName === 'bucket_preset_object') ||
      (db.sysname === 'tms_admin' && clName === 'tms_app_data_action_log') ||
      (db.sysname === 'tms_admin' && clName === 'replica_map')
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
