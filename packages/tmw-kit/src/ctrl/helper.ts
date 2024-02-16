import { ModelCl } from '../model/index.js'
/**
 * 保存元数据的数据库
 */
const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'
/**
 * 保存元数据的集合
 */
const META_ADMIN_CL = 'mongodb_object'
/**
 * 保存标签数据的集合
 */
const META_ADMIN_CL_TAG = 'tag_object'
/**
 * 控制器辅助类
 */
class Helper {
  ctrl
  bucket: { name: string }

  constructor(ctrl) {
    this.ctrl = ctrl
  }
  get bucketObj() {
    return this.ctrl.bucketObj
  }
  /**
   * 存储管理对象的集合
   */
  get clMongoObj() {
    const client = this.ctrl.mongoClient
    const cl = client.db(META_ADMIN_DB).collection(META_ADMIN_CL)

    return cl
  }
  /**
   * 存储标签对象的集合
   */
  get clTagObj() {
    const client = this.ctrl.mongoClient
    const cl = client.db(META_ADMIN_DB).collection(META_ADMIN_CL_TAG)

    return cl
  }
  /**
   * 将请求中指定的分页参数转换为mongodb查询参数
   * @param {object} options - 指定默认值
   * @param {number} [options.defaultSize=10] - 每页包含数量默认值
   *
   * @returns {object} 请求中未指定有效page参数，返回skip=false；否则，返回skip和limit值。
   */
  requestPage({ defaultSize = 10 } = {}) {
    let { page, size } = this.ctrl.request.query
    if (!parseInt(page)) return { skip: false }
    //@ts-ignore
    let limit = parseInt(size) ? parseInt(size) : parseInt(defaultSize)
    let skip = (page - 1) * limit

    return { skip, limit }
  }
  /**
   * 获得请求的数据库
   *
   * @param {boolean} bThrowNotFound - 如果不可访问是否抛出异常
   *
   * @return {object} 数据库
   */
  async findRequestDb(bThrowNotFound = true, dbName = null) {
    if (!dbName) dbName = this.ctrl.request.query.db
    const query: any = { name: dbName, type: 'database' }
    if (this.ctrl.bucket) query.bucket = this.ctrl.bucket.name

    const db = await this.clMongoObj.findOne(query)

    if (bThrowNotFound && !db) throw Error(`指定的数据库[db=${dbName}]不可访问`)

    return db
  }
  /**
   * 获得请求的集合（管理对象）
   *
   * @param {boolean} bThrowNotFound - 没有找到时抛出异常
   *
   * @returns {object} 集合
   */
  async findRequestCl(bThrowNotFound = true, dbName = null, clName = null) {
    if (!dbName || !clName) {
      dbName = this.ctrl.request.query.db
      clName = this.ctrl.request.query.cl
    }
    if (!dbName || !clName) {
      if (bThrowNotFound)
        throw Error(`没有获得有效的数据库和集合名称，无法执行查找操作`)

      return null
    }
    const modelCl = new ModelCl(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )
    const cl = await modelCl.byName(dbName, clName)

    if (bThrowNotFound && !cl)
      throw Error(`指定的集合[db=${dbName}][cl=${clName}]不可访问`)

    return cl
  }
  /**
   * 获得管理集合对应的系统集合对象
   * @param {boolean} tmwCl
   *
   * @returns {object} Collection - 数据库系统集合对象
   */
  findSysColl(tmwCl) {
    let { mongoClient } = this.ctrl
    let sysCl = mongoClient.db(tmwCl.db.sysname).collection(tmwCl.sysname)

    return sysCl
  }
}

export default Helper
