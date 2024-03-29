import { CtrlHelper } from './ctrlHelper.js'
import { ModelDb } from 'tmw-kit'

/**
 * 数据库控制器辅助类
 */
class DbHelper extends CtrlHelper {
  constructor(ctrl) {
    super(ctrl)
  }
  get _modelDb() {
    let model = new ModelDb(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )
    return model
  }
  /**
   * 在系统范围内按名称查找数据库
   *
   * @param {string} sysname
   */
  async dbBySysname(sysname) {
    return await this._modelDb.byName(sysname)
  }
  /**
   * 在bucket范围内按名称查找数据库
   *
   * @param {string} name
   */
  async dbByName(name) {
    return await this._modelDb.byName(name)
  }
  /**
   * 创建数据库
   *
   * @param {string} name
   */
  async dbCreate(info) {
    info.type = 'database'
    return await this._modelDb.create(info)
  }
  /**
   *
   * @param keyword
   * @param skip
   * @param limit
   * @returns
   */
  async list(keyword: string, skip: number, limit: number) {
    return await this._modelDb.list(keyword, skip, limit)
  }
}

export default DbHelper
