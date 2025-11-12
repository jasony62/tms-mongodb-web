import { CtrlHelper } from './ctrlHelper.js'
import { ModelTag, ModelTagRelation } from 'tmw-kit'
/**
 * 标签控制器辅助类
 */
class TagHelper extends CtrlHelper {
  constructor(ctrl) {
    super(ctrl)
  }

  get modelTag() {
    let model = new ModelTag(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )
    return model
  }

  get modelTagRelation() {
    let model = new ModelTagRelation(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )
    return model
  }
  /**
   * 创建标签
   */
  async createTag(info): Promise<boolean | any> {
    return await this.modelTag.create(info)
  }
  /**
   * 列出标签
   */
  async listTag(): Promise<boolean | any> {
    return await this.modelTag.list()
  }
  /**
   * 删除标签
   */
  async removeTag(tagId: string): Promise<boolean | any> {
    return await this.modelTag.remove(tagId)
  }
  /**
   *
   * @param name
   * @returns
   */
  async tagByName(name: string): Promise<boolean | any> {
    return await this.modelTag.byName(name)
  }
  /**
   * 创建标签关系
   */
  async createTagRelation(
    tagId: string,
    target: { id: string; type: string }
  ): Promise<boolean | any> {
    return await this.modelTagRelation.create(tagId, target)
  }
  /**
   * 删除标签关系
   */
  async removeTagRelation(
    tagId: string,
    target: { id: string; type: string }
  ): Promise<boolean | any> {
    return await this.modelTagRelation.remove(tagId, target)
  }
  /**
   * 列出标签关系
   */
  async listTagRelation(
    tagId: string,
    target: { id: string; type: string }
  ): Promise<boolean | any> {
    return await this.modelTagRelation.list()
  }
}

export default TagHelper
