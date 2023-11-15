import mongodb from 'mongodb'
import { nanoid } from 'nanoid'
import Base from './base.js'
import unescape from 'mongo-escape'

const ObjectId = mongodb.ObjectId

const CL_NAME_RE = '^[a-zA-Z]+[0-9a-zA-Z_-]{0,63}$'
class Collection extends Base {
  /**
   * 新建集合
   *
   * @param existDb
   * @param info
   * @returns
   */
  async create(existDb, info) {
    // 加工数据
    this.processBeforeStore(info, 'insert')

    info.type = 'collection'
    info.database = existDb.name

    info.db = { sysname: existDb.sysname, name: existDb.name }
    if (this.bucket) info.bucket = this.bucket.name

    // 检查指定的集合名
    let [passed, nameOrCause] = this.checkClName(info.name)
    if (passed === false) return [false, nameOrCause]
    info.name = nameOrCause

    // 查询是否已存在同名集合
    let existTmwCl = await this.byName(existDb, info.name)
    if (existTmwCl)
      return [
        false,
        `数据库[name=${existDb.name}]中，已存在同名集合[name=${info.name}]`,
      ]

    // 检查是否指定了用途
    let { usage } = info
    if (usage !== undefined) {
      if (![0, 1].includes(parseInt(usage)))
        return [false, `指定了不支持的集合用途值[usage=${usage}]`]
      info.usage = parseInt(usage)
    }

    // 生成数据库系统名
    let existSysCl, sysname
    if (info.sysname) {
      sysname = info.sysname
      existSysCl = await this.bySysname(existDb, sysname)
    } else {
      for (let tries = 0; tries <= 2; tries++) {
        sysname = nanoid(10)
        existSysCl = await this.bySysname(existDb, sysname)
        if (!existSysCl) break
      }
    }
    if (existSysCl) return [false, '无法生成唯一的集合系统名称']

    info.sysname = sysname

    /**在系统中创建集合后记录集合对象信息 */
    const mgdb = this.mongoClient.db(existDb.sysname)

    /**检查集合在数据库中是否已经存在*/
    const sysCl = mgdb.collection(info.sysname)
    if (sysCl) {
      return this.clMongoObj
        .insertOne(info)
        .then((result) => [true, result])
        .catch((err) => [false, err.message])
    }

    return mgdb
      .createCollection(info.sysname)
      .then(() => this.clMongoObj.insertOne(info))
      .then((result) => [true, result])
      .catch((err) => [false, err.message])
  }
  /**
   *
   * @param {object} tmwCl
   */
  async getSchemaByCollection(tmwCl) {
    const client = this.mongoClient
    const cl = client.db('tms_admin').collection('mongodb_object')
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
    const cl = client.db('tms_admin').collection('mongodb_object')
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
    const clMongoObj = client.db('tms_admin').collection('mongodb_object')

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
