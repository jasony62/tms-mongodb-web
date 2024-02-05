import { ResultData, ResultFault } from 'tms-koa'
import { Base as CtrlBase } from 'tmw-kit/dist/ctrl/index.js'
import DirHelper from './dirHelper.js'

class DirBase extends CtrlBase {
  /**
   *
   */
  dirHelper
  /**
   * 请求中指定的数据库
   */
  reqDb

  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.dirHelper = new DirHelper(this)
  }
  /**
   * 执行每个方法前执行
   */
  async tmsBeforeEach(): Promise<true | ResultFault> {
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    // 请求中指定的db
    this.reqDb = await this.dirHelper.findRequestDb()

    return true
  }
  /**
   * 指定数据库下新建集合分类
   */
  async create() {
    const info = this.request.body
    if (this.bucketObj) info.bucket = this.bucketObj.name
    if (!info.name || !info.title)
      return new ResultFault('分类目录名称不允许为空')

    const existDb = this.reqDb
    let [flag, result] = await this.dirHelper.createDir(
      existDb,
      info,
      info.parentFullName
    )

    if (!flag) {
      return new ResultFault(result)
    }

    info._id = result.insertedId

    return new ResultData(info)
  }
  /**
   * 更新集合分类
   */
  async update() {
    const { id } = this.request.query
    if (!id) return new ResultFault('参数不完整')

    const existDb = this.reqDb

    const info = this.request.body

    let [flag, result] = await this.dirHelper.updateDir(existDb, id, info)

    if (!flag) {
      return new ResultFault(result)
    }

    return new ResultData(true)
  }
  /**
   * 删除集合分类
   */
  async remove() {
    const { id } = this.request.query
    if (!id) return new ResultFault('参数不完整')

    const existDb = this.reqDb
    let [flag, result] = await this.dirHelper.removeDir(existDb, id)

    if (!flag) {
      return new ResultFault(result)
    }

    return new ResultData(true)
  }
  /**
   * 指定数据库下的所有集合分类
   */
  async list() {
    const existDb = this.reqDb
    let [flag, result] = await this.dirHelper.listDir(existDb)

    if (!flag) {
      return new ResultFault(result)
    }

    return new ResultData(result)
  }
}

export default DirBase
