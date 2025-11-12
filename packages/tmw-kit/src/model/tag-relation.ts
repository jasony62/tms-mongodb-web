import Base from './base.js'
import Tag from './tag.js'

class TagRelation extends Base {
  /**
   * 获得标签模型实例
   */
  get modelTag() {
    let model = new Tag(this.mongoClient, this.bucket, this.client)
    return model
  }
  /**
   * 新建标签关系
   *
   * @param tagId
   * @param targetId
   */
  async create(
    tagId: string,
    target: { id: string; type: string }
  ): Promise<[boolean, any]> {
    const tagObj = await this.modelTag.byId(tagId)
    if (!tagObj) {
      return [false, `不存在指定的标签[name=${tagId}]，无法创建标签关系`]
    }

    const [success, existTag] = await this.exists(tagId, target)
    if (success && existTag) {
      return [false, `标签关系已存在，无法重复创建标签关系`]
    }

    const newRelation: any = { tagId, tagName: tagObj.name, target }

    // 补充所述bucket信息
    if (this.bucket) newRelation.bucket = this.bucket.name

    return this.clTagRelation
      .insertOne(newRelation)
      .then((result) => [true, { id: result.insertedId }])
      .catch((err) => [false, err.message])
  }
  /**
   * 更新目标对象的标签关系列表
   *
   * @param targetType
   * @param targetId
   * @param tags
   */
  async update(
    targetType: string,
    targetId: string,
    tags: { tagId: string }[]
  ) {
    // 删除已有的标签关系
    await this.removeByTarget({ id: targetId, type: targetType })
    // 创建新的标签关系
    const newTags = []
    for (let tag of tags) {
      if (typeof tag === 'string') {
        /**
         * 新建标签
         */
        const [flag, result] = await this.modelTag.create({ name: tag })
        if (flag === true) {
          await this.create(result.id.toString(), {
            id: targetId,
            type: targetType,
          })
          newTags.push({ tagId: result.id.toString(), tagName: tag })
        }
      } else {
        await this.create(tag.tagId, { id: targetId, type: targetType })
        newTags.push(tag)
      }
    }

    return newTags
  }
  /**
   * 删除标签关系
   *
   * @param tagId
   * @param targetId
   */
  async remove(
    tagId: string,
    target: { id: string; type: string }
  ): Promise<[boolean, any]> {
    const query: any = { tagId, target }

    // 补充所述bucket信息
    if (this.bucket) query.bucket = this.bucket.name

    return this.clTagRelation
      .deleteOne(query)
      .then((result) => [true, { deletedCount: result.deletedCount }])
      .catch((err) => [false, err.message])
  }
  /**
   * 删除目标对象所有的标签关系
   *
   * @param tagId
   * @param targetId
   */
  async removeByTarget(target: {
    id: string
    type: string
  }): Promise<[boolean, any]> {
    const query: any = { target }

    // 补充所述bucket信息
    if (this.bucket) query.bucket = this.bucket.name

    return this.clTagRelation
      .deleteOne(query)
      .then((result) => [true, { deletedCount: result.deletedCount }])
      .catch((err) => [false, err.message])
  }
  /**
   * 列出所有标签关系
   *
   * @returns
   */
  async list(): Promise<[boolean, any]> {
    const query: any = {}

    if (this.bucket) query.bucket = this.bucket.name

    let tags = await this.clTagRelation
      .find(query, { projection: { bucket: 0 } })
      .toArray()
    return [true, tags]
  }
  /**
   * 是否存在标签关系
   *
   * @returns
   */
  async exists(
    tagId: string,
    target: { id: string; type: string }
  ): Promise<[boolean, any]> {
    const query: any = { tagId, target }

    if (this.bucket) query.bucket = this.bucket.name

    let tag = await this.clTagRelation.findOne(query, {
      projection: { bucket: 0 },
    })
    return [true, tag]
  }
}

export default TagRelation
