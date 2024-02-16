import mongodb from 'mongodb'
import { nanoid } from 'nanoid'
import Base from './base.js'
import unescape from 'mongo-escape'
import { ElasticSearchIndex } from '../elasticsearch/index.js'
import { SchemaIter } from '../schema.js'
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
      usage,
      spreadsheet,
      adminOnly,
      tags,
      schema_tags,
      schema_default_tags,
      operateRules,
      docFieldConvertRules,
      custom,
    } = info
    const newCl: any = {
      name,
      title,
      description,
      dir_full_name,
      schema_id,
      usage,
      spreadsheet,
      adminOnly,
      tags,
      schema_tags,
      schema_default_tags,
      operateRules,
      docFieldConvertRules,
      custom,
    }
    if (info.sysname) newCl.sysname = info.sysname
    if (info.usage) newCl.usage = info.usage

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

    // 检查是否指定了用途
    let { usage } = newCl
    if (usage !== undefined) {
      if (![0, 1].includes(parseInt(usage)))
        return [false, `指定了不支持的集合用途值[usage=${usage}]`]
      newCl.usage = parseInt(usage)
    }

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

    const { _id, sysname, database, db, type, bucket, usage, ...updatedInfo } =
      info

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
      updatedInfo?.custom?.elasticsearch?.enabled === true
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
   * @param {object|string} db - 集合所属数据库
   * @param {string} clName - 用户指定集合名称
   *
   * @returns {object} 集合对象
   */
  async byName(db, clName) {
    const query: any = { name: clName, type: 'collection' }

    if (typeof db === 'object') query['db.sysname'] = db.sysname
    else if (typeof db === 'string') query['db.name'] = db

    if (this.bucket) query.bucket = this.bucket.name

    const client = this.mongoClient
    const clMongoObj = client.db(META_ADMIN_DB).collection('mongodb_object')

    const cl = await clMongoObj.findOne(query)

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
  /**
   * 检查是否符合集合中指定的删除约束条件
   * @param {object} tmwCl - 指定的集合管理对象
   * @param {object} query - 指定的删除条件
   * @param {object} sysCl - 系统集合
   *
   * @throws 如果不满足删除条件，抛出异常说明原因
   *
   * @return {boolean} 返回ture，通过检查
   */
  async checkRemoveConstraint(tmwCl, query, sysCl) {
    if (tmwCl.custom && tmwCl.custom.docRemoveConstraint) {
      let { docRemoveConstraint } = tmwCl.custom
      if (typeof docRemoveConstraint === 'object') {
        docRemoveConstraint = unescape(docRemoveConstraint)
        /**检查是否符合用户指定的文档删除规则 */
        let count1 = await sysCl.countDocuments(query)
        let count2 = await sysCl.countDocuments(
          Object.assign({}, query, docRemoveConstraint)
        )
        if (count1 !== count2)
          throw Error('要删除的文档不符合在集合上指定删除限制规则')
      }
    }

    return true
  }
}

export default Collection
