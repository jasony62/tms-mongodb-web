import { ResultData, ResultFault } from 'tms-koa'
import { Base } from 'tmw-kit/dist/ctrl/index.js'
import SpreadsheetHelper from './spreadsheetHelper.js'

/**
 * 自由表格
 */
class SpreadsheetBase extends Base {
  ssHelper

  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.ssHelper = new SpreadsheetHelper(this)
  }

  /**
   * 执行每个方法前执行
   */
  async tmsBeforeEach(): Promise<true | ResultFault> {
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    return true
  }

  async list() {
    const [isOk, result] = await this.ssHelper.list()
    if (!isOk) return new ResultFault(result)
    return new ResultData(result)
  }

  async byId() {
    const { id } = this.request.query
    const [isOk, result] = await this.ssHelper.byId(id)
    if (!isOk) return new ResultFault(result)
    return new ResultData(result)
  }

  async changelog() {
    const { id, skipVer } = this.request.query

    if (isNaN(parseInt(skipVer)))
      return new ResultFault('参数skipVer错误，不是整数')

    const [isOk, result] = await this.ssHelper.changelog(id, parseInt(skipVer))
    if (!isOk) return new ResultFault(result)
    return new ResultData(result)
  }

  async create() {
    const [isOk, result] = await this.ssHelper.create()
    if (!isOk) return new ResultFault(result)
    return new ResultData(result)
  }

  async save() {
    const { id } = this.request.query
    const { ver, delta } = this.request.body

    if (!parseInt(ver)) return new ResultFault('参数ver错误，不是大于0的整数')

    if (!delta) return new ResultFault('没有指定要修改的内容')

    const [isOk, result] = await this.ssHelper.save(id, parseInt(ver), delta)
    if (!isOk) return new ResultFault(result)

    return new ResultData(result)
  }
}

export default SpreadsheetBase
