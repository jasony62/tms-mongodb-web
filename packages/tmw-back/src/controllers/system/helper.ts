import { ModelCl } from 'tmw-kit'

/**
 * 保存元数据的数据库
 */
const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'

/**
 * 控制器辅助类
 */
class Helper {
  constructor(ctrl) {
    this['ctrl'] = ctrl
  }
  /**
   * 存储管理对象的集合
   */
  get clPreset() {
    const client = this['ctrl'].mongoClient
    const cl = client.db(META_ADMIN_DB).collection('bucket_preset_object')

    return cl
  }
  /**
   * 按名称查找数据库
   *
   * @param {string} name
   */
  async dbByName(name) {
    const query = { name, type: 'database' }

    const db = await this.clPreset.findOne(query)

    return db
  }
  /**
   * 按名称查找指定数据库内的集合
   *
   * @param {string} dbName
   * @param {string} name
   */
  async colByName(dbName, name) {
    const query = { database: dbName, name, type: 'collection' }

    const db = await this.clPreset.findOne(query)

    return db
  }
  /**
   * 获得请求的数据库
   *
   * @param {boolean} bThrowNotFound 如果不可访问是否抛出异常
   */
  async findRequestDb(bThrowNotFound = true) {
    const dbName = this['ctrl'].request.query.db
    const query = { name: dbName, type: 'database' }

    const db = await this.clPreset.findOne(query)

    if (bThrowNotFound && !db) throw Error('指定的数据库不可访问')

    return db
  }
  /**
   *  检查集合名
   */
  checkClName(clName) {
    let model = new ModelCl(
      this['ctrl'].mongoClient,
      this['ctrl'].bucket,
      this['ctrl'].client
    )
    return model.checkClName(clName)
  }
}

export default Helper
