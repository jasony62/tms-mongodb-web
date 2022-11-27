import { ResultData } from 'tms-koa'
import Base from 'tmw-kit/dist/ctrl/base'
import TagHelper from './tagHelper'

/**
 * 标签控制器基类
 */
class TagBase extends Base {
  constructor(...args) {
    super(...args)
    this.tagHelper = new TagHelper(this)
  }
  async tmsBeforeEach() {
    let result = await super.tmsBeforeEach()
    if (true !== result) return result

    this.clMongoObj = this.tagHelper.clMongoObj

    return true
  }
  /**
   * 查询所有标签
   */
  async list() {
    const query: any = { type: 'tag' }
    if (this.bucket && typeof this.bucket === 'object')
      query.bucket = this.bucket.name

    const tmsTags = await this.clMongoObj.find(query).toArray()

    return new ResultData(tmsTags)
  }
}

export default TagBase
