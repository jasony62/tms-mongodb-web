import { Helper } from 'tmw-kit/dist/ctrl/index.js'
import { ModelTag } from 'tmw-kit'

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
    const modelTag = new ModelTag(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )
    return modelTag.findByName(name, this.ctrl.bucketObj?.name)
  }
}

export default TagHelper
