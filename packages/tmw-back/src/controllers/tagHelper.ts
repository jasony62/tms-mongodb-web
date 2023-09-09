import { Helper } from 'tmw-kit/dist/ctrl/index.js'

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
    const query: any = { name }
    if (this.ctrl.bucketObj && typeof this.ctrl.bucketObj === 'object')
      query.bucket = this.ctrl.bucketObj.name

    const tag = await this.clTagObj.findOne(query)

    return tag
  }
}

export default TagHelper
