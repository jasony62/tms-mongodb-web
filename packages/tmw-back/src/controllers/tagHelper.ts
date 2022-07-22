import Helper from 'tmw-kit/dist/ctrl/helper'

/**
 * 标签控制器辅助类
 */
class TagHelper extends Helper {
  /**
   * 在bucket范围内按名称查找标签
   *
   * @param {string} name
   */
  async tagByName(name) {
    const query = { name, type: 'tag' }
    if (this.ctrl.bucket) query['bucket'] = this.ctrl.bucket.name

    const tag = await this.clMongoObj.findOne(query)

    return tag
  }
}

export default TagHelper
