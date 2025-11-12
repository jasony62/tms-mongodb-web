import { ResultData, ResultFault } from 'tms-koa'
import { Base } from 'tmw-kit/dist/ctrl/index.js'
import TagHelper from './tagHelper.js'

/**
 * 标签控制器基类
 */
class TagBase extends Base {
  tagHelper

  clMongoObj

  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.tagHelper = new TagHelper(this)
  }

  async tmsBeforeEach(): Promise<true | ResultFault> {
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    this.clMongoObj = this.tagHelper.clMongoObj

    return true
  }
  /**
   * 查询所有标签
   */
  async list() {
    const [flag, result] = await this.tagHelper.listTag()

    if (!flag) return new ResultFault(result)

    return new ResultData(result)
  }
}

export default TagBase
