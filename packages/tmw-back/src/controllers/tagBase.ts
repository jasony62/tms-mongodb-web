import { ResultData, ResultFault } from 'tms-koa'
import { Base } from 'tmw-kit/dist/ctrl/index.js'
import TagHelper from './tagHelper.js'

/**
 * 标签控制器基类
 */
class TagBase extends Base {
  tagHelper

  clMongoObj

  clTagObj

  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.tagHelper = new TagHelper(this)
  }

  async tmsBeforeEach(): Promise<true | ResultFault> {
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    this.clMongoObj = this.tagHelper.clMongoObj
    this.clTagObj = this.tagHelper.clTagObj

    return true
  }
  /**
   * 查询所有标签
   */
  async list() {
    const query: any = {}
    if (this.bucketObj && typeof this.bucketObj === 'object')
      query.bucket = this.bucketObj.name

    const tmsTags = await this.clTagObj.find(query).toArray()

    return new ResultData(tmsTags)
  }
}

export default TagBase
