import mongodb from 'mongodb'
import { nanoid } from 'nanoid'
import Base from './base.js'
import unescape from 'mongo-escape'
import { ElasticSearchIndex } from '../elasticsearch/index.js'
import { SchemaIter } from '../schema.js'
import ModelSpreadsheet from './spreadsheet.js'
import ModelSchema from './schema.js'
import ModelAcl from './acl.js'
import Document from './document.js'
import Debug from 'debug'

const debug = Debug('tmw-kit:model:collection')

const ObjectId = mongodb.ObjectId

const CL_NAME_RE = '^[a-zA-Z]+[0-9a-zA-Z_-]{0,63}$'

/**
 * 保存元数据的数据库
 */
const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'

class Collection extends Base {
  get _modelSchema() {
    const modelSc = new ModelSchema(this.mongoClient, this.bucket, this.client)
    return modelSc
  }
  get _modelAcl() {
    const model = new ModelAcl(this.mongoClient, this.bucket, this.client)
    return model
  }
  /**
   * 从传入的数据生成安全的集合对象
   *
   * @param info
   * @returns
   */
  sanitize(info: any): any {
    const {
      name,
      title,
      description,
      dir_full_name,
      schema_id,
      ext_schemas,
      spreadsheet,
      aclCheck,
      docAclCheck,
      adminOnly,
      tags,
      docFieldConvertRules,
      extensions,
    } = info
    const newCl: any = {
      name,
      title,
      description,
      dir_full_name,
      schema_id,
      ext_schemas,
      spreadsheet,
      aclCheck,
      docAclCheck,
      adminOnly,
      tags,
      docFieldConvertRules,
      extensions,
    }
    if (info.sysname) newCl.sysname = info.sysname

    return newCl
  }
  /**
   * 新建集合
   *
   * @param existDb
   * @param newCl
   * @returns
   */
  async create(existDb, info) {
    const newCl: any = this.sanitize(info)
    // 加工数据
    this.processBeforeStore(newCl, 'insert')

    newCl.type = 'collection'
    // newCl.database = existDb.name

    newCl.db = { sysname: existDb.sysname, name: existDb.name }
    if (this.bucket) newCl.bucket = this.bucket.name

    // 检查指定的集合名
    let [passed, nameOrCause] = this.checkClName(newCl.name)
    if (passed === false) return [false, nameOrCause]

    // 查询是否已存在同名集合
    let existTmwCl = await this.byName(existDb, newCl.name)
    if (existTmwCl)
      return [
        false,
        `数据库[name=${existDb.name}]中，已存在同名集合[name=${newCl.name}]`,
      ]

    // 生成数据库系统名
    let existSysCl, sysname
    if (newCl.sysname) {
      sysname = newCl.sysname
      existSysCl = await this.bySysname(existDb, sysname)
    } else {
      for (let tries = 0; tries <= 2; tries++) {
        sysname = nanoid(10)
        existSysCl = await this.bySysname(existDb, sysname)
        if (!existSysCl) break
      }
    }
    if (existSysCl) return [false, '无法生成唯一的集合系统名称']

    newCl.sysname = sysname

    // 没有指定访问控制要求时，使用系统指定的默认配置
    if (newCl.aclCheck === null || newCl.aclCheck === undefined) {
      newCl.aclCheck = !!this.tmwConfig.TMW_APP_DEFAULT_ACLCHECK_CL
    }
    if (newCl.docAclCheck === null || newCl.docAclCheck === undefined) {
      newCl.docAclCheck = !!this.tmwConfig.TMW_APP_DEFAULT_ACLCHECK_DOC
    }

    /**在系统中创建集合后记录集合对象信息 */
    const mgdb = this.mongoClient.db(existDb.sysname)

    /**检查集合在数据库中是否已经存在*/
    const sysCl = mgdb.collection(newCl.sysname)
    if (sysCl) {
      return this.clMongoObj
        .insertOne(newCl)
        .then((result) => [true, result])
        .catch((err) => [false, err.message])
    }

    return mgdb
      .createCollection(newCl.sysname)
      .then(() => this.clMongoObj.insertOne(newCl))
      .then((result) => [true, result])
      .catch((err) => [false, err.message])
  }
  /**
   * 更新指定数据库下的集合
   *
   * @param tmwDb
   * @param existCl
   * @param info
   * @returns
   */
  async update(tmwDb, existCl, info) {
    // 格式化集合名
    let newClName
    if (info.name !== undefined && info.name !== existCl.name) {
      newClName = this.checkClName(info.name)
      if (newClName[0] === false) return [false, newClName[1]]
      // 查询是否已存在同名集合
      let existTmwCl = await this.byName(tmwDb, info.name)
      if (existTmwCl)
        return [
          false,
          `数据库[name=${tmwDb.name}]中，已存在同名集合[name=${info.name}]`,
        ]
    }

    // 查询是否已存在同名集合
    if (newClName) {
      let otherCl = await this.byName(tmwDb, newClName)
      if (otherCl)
        return [
          false,
          `数据库[name=${tmwDb.name}]中，已存在同名集合[name=${newClName}]`,
        ]
    }

    const { _id, sysname, database, db, type, bucket, ...updatedInfo } = info

    // 需要清除的字段。应该考虑根据schema做清除。
    const cleaned = { children: '' }

    const rst = await this.clMongoObj
      .updateOne({ _id: existCl._id }, { $set: updatedInfo, $unset: cleaned })
      .then((rst) => [true, rst.result])
      .catch((err) => [false, err.message])

    if (rst[0] === false) return [false, rst[1]]

    // 更新es索引
    const { schema_id } = existCl
    if (
      ElasticSearchIndex.available() &&
      updatedInfo?.extensions?.elasticsearch?.enabled === true
    ) {
      if (schema_id && typeof schema_id === 'string') {
        const modelDoc = new Document(
          this.mongoClient,
          this.bucket,
          this.client
        )
        // 集合的文档字段定义
        let docSchema = await modelDoc.getDocSchema(schema_id)
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
            if (attrs.type === 'string' && attrs.fulltextSearch === true) {
              Object.assign(properties, {
                [fullname]: { type: 'text', analyzer },
              })
            }
          }
          const esIndexName = `${existCl.db.sysname}+${existCl.sysname}`
          if (Object.keys(properties).length) {
            const config = { mappings: { properties } }
            const esIndex = new ElasticSearchIndex(esIndexName)
            await esIndex.configure(config)
            debug(
              `配置集合的es索引【${esIndexName}】，配置：\n%s`,
              JSON.stringify(config)
            )
          } else {
            debug(`配置集合的es索引【${esIndexName}】失败，配置内容为空。`)
          }
        }
      }
    }

    return [true, info]
  }
  /**
   * 删除集合
   * @param tmwDb
   * @param id
   * @returns
   */
  async remove(tmwDb, id: string) {
    const tmwCl = await this.byId(tmwDb, id)
    /**
     * 删除自由表格数据
     */
    if (tmwCl.spreadsheet === 'yes') {
      await this._removeSpreadsheet(tmwDb, tmwCl)
    }
    /**
     * 删除集合的元数据定义
     */
    await this.clMongoObj.deleteOne({ _id: tmwCl._id })
    /**
     * 删除schema
     */
    await this._removeClSchema(tmwCl)
    /**
     * 删除数据库集合
     */
    return this.mongoClient
      .db(tmwDb.sysname)
      .dropCollection(tmwCl.sysname)
      .then(() => 'ok')
      .catch((error) => {
        if (error.message === 'ns not found') return 'ok'
        return error.message
      })
  }
  /**
   * 删除关联的自由表格
   * @param tmwDb
   * @param tmwCl
   */
  async _removeSpreadsheet(tmwDb, tmwCl) {
    const modelSS = new ModelSpreadsheet(
      this.mongoClient,
      this.bucket,
      this.client
    )
    await modelSS.removeByCl(tmwDb.sysname, tmwCl.sysname)
  }
  /**
   * 删除集合关联的文档列定义
   * @param tmwCl
   */
  async _removeClSchema(tmwCl) {
    const modelSc = new ModelSchema(this.mongoClient, this.bucket, this.client)
    const schema = await modelSc.bySchemaId(tmwCl.schema_id, {
      onlyProperties: false,
    })
    if (schema.TMW_CREATE_FROM === 'collection') {
      await modelSc.removeById(tmwCl.schema_id)
    }
  }
  /**
   * 填充集合对应的schema信息
   *
   * 补充集合的schema信息，解决集合层级关系
   */
  async processCl(tmwCls: any[]) {
    /**
     * 进行批量查询，减少数据库访问次数
     */
    const clSchemaIds = tmwCls.reduce((ids, tmwCl) => {
      const { schema_id } = tmwCl
      if (schema_id || typeof schema_id === 'string')
        ids.push(new ObjectId(schema_id))
      return ids
    }, [])

    const schemas = await this._modelSchema.bySchemaIds(clSchemaIds, {
      projection: { name: 1, parentName: 1, order: 1 },
    })
    const idToSchema: any = schemas.reduce((m, s) => {
      m[s._id.toString()] = s
      return m
    }, {})

    const result = tmwCls.map(async (tmwCl) => {
      // 集合没有指定有效的schema_id
      if (!tmwCl.schema_id || typeof tmwCl.schema_id !== 'string') return tmwCl

      const schema = idToSchema[tmwCl.schema_id]
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
  /**
   * 获取数据库下的集合列表
   *
   * @param dbSysname
   * @param dirFullName
   * @param keyword
   * @param skip
   * @param limit
   * @returns
   */
  async list(
    dbSysname: string,
    dirFullName: string,
    keyword: string,
    skip: number,
    limit: number
  ) {
    const query: any = {
      type: 'collection',
      'db.sysname': dbSysname,
    }

    // 检查授权访问列表条件
    let queryAclCheck: any[]

    // 当前用户不是管理员，仅管理员可见的集合不允许访问
    if (this.client.isAdmin !== true) {
      // 不能是仅管理员访问
      query.adminOnly = { $ne: true }
      // 检查授权访问列表
      queryAclCheck = [
        { creator: { $eq: this.client.id } }, // 创建人允许访问
        { aclCheck: { $ne: true } }, // 没有限制访问
      ]
      // 获得当前用户在acl列表中授权访问的数据库
      const aclResult = await this._modelAcl.targetByUser(
        { type: 'collection' },
        { id: this.client.id }
      )
      if (Array.isArray(aclResult.collection) && aclResult.collection.length) {
        const queryAcl = aclResult.collection.map((id) => new ObjectId(id))
        queryAclCheck.push({ _id: { $in: queryAcl } })
      }
    }
    if (this.bucket) query.bucket = this.bucket.name
    if (dirFullName) {
      query.dir_full_name = {
        $regex: new RegExp('^' + dirFullName + '(?=/|$)'),
      }
    }
    if (keyword) {
      let re = new RegExp(keyword)
      query.$and = [
        {
          $or: [
            { name: { $regex: re, $options: 'i' } },
            { title: { $regex: re, $options: 'i' } },
            { description: { $regex: re, $options: 'i' } },
          ],
        },
      ]
      if (queryAclCheck)
        query.$and.push({
          $or: queryAclCheck,
        })
    } else {
      if (queryAclCheck) query.$or = queryAclCheck
    }
    const options: any = {
      projection: { type: 0 },
    }
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
      return { collections: newTmwCls, total }
    }

    return newTmwCls
  }
  /**
   *
   * @param {object} tmwCl
   */
  async getSchemaByCollection(tmwCl) {
    const client = this.mongoClient
    const cl = client.db(META_ADMIN_DB).collection('mongodb_object')
    // 获取表列
    return cl
      .findOne({
        'db.sysname': tmwCl.db.sysname,
        name: tmwCl.name,
        type: 'collection',
      })
      .then((myCl) => {
        if (!myCl) {
          return false
        }
        if (myCl.schema_id) {
          return cl
            .findOne({ type: 'schema', _id: new ObjectId(myCl.schema_id) })
            .then((schema) => {
              if (!schema) {
                return false
              }

              return schema.body.properties
            })
        }

        return false
      })
  }
  //
  static async getCollection(existDb, clName) {
    const client = await this['mongoClient']
    const cl = client.db(META_ADMIN_DB).collection('mongodb_object')
    //
    return cl
      .findOne({
        'db.sysname': existDb.sysname,
        name: clName,
        type: 'collection',
      })
      .then((result) => result)
      .then((myCl) => {
        if (myCl.schema_id) {
          return cl
            .findOne({ type: 'schema', _id: new ObjectId(myCl.schema_id) })
            .then((schema) => {
              myCl.schema = schema
              delete myCl.schema_id
              return myCl
            })
        }
        delete myCl.schema_id
        return myCl
      })
  }
  /**
   *  检查集合名
   */
  checkClName(clName) {
    if (new RegExp(CL_NAME_RE).test(clName) !== true)
      return [
        false,
        '集合名必须以英文字母开头，仅限英文字母或_或-或数字组合，且最长64位',
      ]

    // 集合名是否存在关键字中
    let keyWord = []
    if (keyWord.includes(clName))
      return [false, '不能以此名作为集合名，请更换为其它名称']

    return [true, clName]
  }
  /**
   * 获得用户指定的集合信息
   *
   * @param {object|string} tmwDb - 集合所属数据库
   * @param {string} id - 用户指定集合Id
   *
   * @returns {object} 集合对象
   */
  async byId(tmwDb, id: string) {
    const query: any = { _id: new ObjectId(id), type: 'collection' }

    if (typeof tmwDb === 'object') query['db.sysname'] = tmwDb.sysname
    else if (typeof tmwDb === 'string') query['db.name'] = tmwDb

    if (this.bucket) query.bucket = this.bucket.name

    const client = this.mongoClient
    const clMongoObj = client.db(META_ADMIN_DB).collection('mongodb_object')

    const cl = await clMongoObj.findOne(query)

    return cl
  }
  /**
   * 获得用户指定的集合信息
   *
   * @param {object|string} tmwDb - 集合所属数据库
   * @param {string} clName - 用户指定集合名称
   *
   * @returns {object} 集合对象
   */
  async byName(tmwDb, clName: string) {
    const query: any = { name: clName, type: 'collection' }

    if (typeof tmwDb === 'object') query['db.sysname'] = tmwDb.sysname
    else if (typeof tmwDb === 'string') query['db.name'] = tmwDb

    if (this.bucket) query.bucket = this.bucket.name

    const client = this.mongoClient
    const clMongoObj = client.db(META_ADMIN_DB).collection('mongodb_object')

    const cl = await clMongoObj.findOne(query)
    if (cl) {
      if (cl.aclCheck === true && cl.creator !== this.client.id) {
        const right = await this._modelAcl.check(
          { id: cl._id.toString(), type: 'collection' },
          { id: this.client.id }
        )
        if (!right) throw Error('没有访问权限')
        cl.right = right
      }
    }

    return cl
  }
  /**
   * 在数据库内按系统名称查找集合
   *
   * @param {object} db - 集合所属数据库
   * @param {string} clSysname - 集合系统名称
   *
   * @returns {object} 集合对象
   */
  async bySysname(db, clSysname) {
    const query: any = {
      'db.sysname': db.sysname,
      sysname: clSysname,
      type: 'collection',
    }
    if (this.bucket) query.bucket = this.bucket.name

    const cl = await this.clMongoObj.findOne(query)

    return cl
  }
}

export default Collection
