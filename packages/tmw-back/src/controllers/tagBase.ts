import { ResultData, ResultFault } from 'tms-koa'
import { Base } from 'tmw-kit/dist/ctrl/index.js'
import { ModelTag } from 'tmw-kit'
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
    const modelTag = new ModelTag(this.mongoClient, this.bucket, this.client)

    const tmsTags = await modelTag.list(this.bucketObj?.name)

    return new ResultData(tmsTags)
  }
}

export default TagBase
