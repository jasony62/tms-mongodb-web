import { Double, ObjectId } from 'mongodb'
import { nanoid } from 'nanoid'
import Base from './base.js'
import ModelAcl from './acl.js'

// 数据库名正则表达式
const DB_NAME_RE = '^[a-zA-Z]+[0-9a-zA-Z_-]{0,63}$'

class Db extends Base {
  get _modelAcl() {
    const model = new ModelAcl(this.mongoClient, this.bucket, this.client)
    return model
  }
  /**
   *  检查数据库名
   * @param {string} dbName - 用户指定数据库名称
   */
  checkDbName(dbName) {
    //格式化库名
    if (new RegExp(DB_NAME_RE).test(dbName) !== true)
      return [
        false,
        '库名必须以英文字母开头，可用英文字母或_或-或数字组合，最长64位',
      ]

    return [true, dbName]
  }
  /**
   * 创建数据库
   *
   * @param {string} name
   */
  async create(info) {
    info.type = 'database'

    // 检查数据库名
    let newName = this.checkDbName(info.name)
    if (newName[0] === false) return [false, newName[1]]
    info.name = newName[1]

    // 查询是否存在同名库
    let existTmwDb = await this.byName(info.name)
    if (existTmwDb) return [false, `已存在同名数据库[name=${info.name}]`]

    // 生成数据库系统名
    let existSysDb, sysname
    if (info.sysname) {
      sysname = info.sysname
      existSysDb = await this.bySysname(info.sysname)
    } else {
      for (let tries = 0; tries <= 2; tries++) {
        sysname = nanoid(10)
        existSysDb = await this.bySysname(sysname)
        if (!existSysDb) break
      }
    }
    if (existSysDb) return [false, '无法生成有效数据库名称']

    info.sysname = sysname

    // 没有指定访问控制要求时，使用系统指定的默认配置
    if (info.aclCheck === null || info.aclCheck === undefined) {
      info.aclCheck = !!this.tmwConfig.TMW_APP_DEFAULT_ACLCHECK_DB
    }

    // 加工数据
    this.processBeforeStore(info, 'insert')

    return this.clMongoObj
      .insertOne(info)
      .then((result) => {
        info._id = result.insertedId
        return [true, info]
      })
      .catch((err) => [false, err.message])
  }
  /**
   * 获得用户指定的数据库信息
   *
   * @param {string} dbName - 用户指定数据库名称
   *
   * @returns {object} 数据库对象
   */
  async byName(dbName) {
    const query: any = { name: dbName, type: 'database' }
    if (this.bucket) query.bucket = this.bucket.name

    const db = await this.clMongoObj.findOne(query)
    if (db) {
      if (db.aclCheck === true && db.creator !== this.client.id) {
        const right = await this._modelAcl.check(
          { id: db._id.toString(), type: 'database' },
          { id: this.client.id }
        )
        if (!right) throw Error('没有访问权限')
        db.right = right
      }
    }

    return db
  }
  /**
   * 在系统范围内按名称查找数据库
   *
   * @param {string} sysname
   */
  async bySysname(sysname) {
    const query = { sysname, type: 'database' }

    const db = await this.clMongoObj.findOne(query)

    return db
  }
  /**
   * 获得当前用户可访问数据库列表
   *
   * @param keyword
   * @param skip
   * @param limit
   * @returns
   */
  async list(keyword: string, skip: number, limit: number) {
    const query: any = { type: 'database' }

    // 检查授权访问列表条件
    let queryAclCheck: any[]

    // 当前用户不是管理员，仅管理员可见的数据库不允许访问
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
        { type: 'database' },
        { id: this.client.id }
      )
      if (Array.isArray(aclResult.database) && aclResult.database.length) {
        const queryAcl = aclResult.database.map((id) => new ObjectId(id))
        queryAclCheck.push({ _id: { $in: queryAcl } })
      }
    }

    if (this.bucket) query.bucket = this.bucket.name

    if (keyword) {
      if (/\(/.test(keyword)) {
        keyword = keyword.replace(/\(/g, '\\(')
      }
      if (/\)/.test(keyword)) {
        keyword = keyword.replace(/\)/g, '\\)')
      }
      let re = new RegExp(keyword)
      query.$and = [
        {
          $or: [
            { name: { $regex: re, $options: 'i' } },
            { title: { $regex: re, $options: 'i' } },
            { description: { $regex: re, $options: 'i' } },
            { tag: { $regex: re, $options: 'i' } },
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
      sort: { top: -1, _id: -1 },
    }
    // 添加分页条件
    if (typeof skip === 'number') {
      options.skip = skip
      options.limit = limit
    }

    const tmwDbs = await this.clMongoObj.find(query, options).toArray()
    if (typeof skip === 'number') {
      let total = await this.clMongoObj.countDocuments(query)
      return { databases: tmwDbs, total }
    }

    return tmwDbs
  }
  /**
   *
   */
  async getProfilingStatus(dbOrDbName: string) {
    let db
    if (dbOrDbName && typeof dbOrDbName === 'string')
      db = await this.byName(dbOrDbName)
    else db = dbOrDbName

    const sysDb = this.mongoClient.db(db.sysname)

    const level = await sysDb.profilingLevel()

    const profile = level === 'all' ? 2 : level === 'slow_only' ? 1 : 0

    const result = await sysDb.command({
      profile,
    })

    return result
  }
  /**
   *
   */
  async setProfilingLevel(dbOrDbName: string, params: any) {
    let db
    if (dbOrDbName && typeof dbOrDbName === 'string')
      db = await this.byName(dbOrDbName)
    else db = dbOrDbName

    let { profile = 1, slowms, sampleRate, filter } = params

    const cmd: any = { profile }
    if (slowms && parseInt(slowms)) cmd.slowms = parseInt(slowms)
    if (sampleRate && parseFloat(sampleRate))
      cmd.sampleRate = new Double(sampleRate)
    if (filter && typeof filter === 'object') cmd.filter = filter

    const sysDb = this.mongoClient.db(db.sysname)

    const result = await sysDb.command(cmd)

    return result.ok === 1
  }
  /**
   * 指定管理命令
   */
  async runCommand(dbOrDbName: string, params: any) {
    let result
    if (params.top) {
      let admin = this.mongoClient.db().admin()
      result = await admin.command(params)
    } else {
      let db
      if (dbOrDbName && typeof dbOrDbName === 'string')
        db = await this.byName(dbOrDbName)
      else db = dbOrDbName
      const sysDb = this.mongoClient.db(db.sysname)
      result = await sysDb.command(params)
    }

    return result
  }
}

export default Db
