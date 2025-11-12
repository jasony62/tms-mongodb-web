import { ObjectId } from 'mongodb'
import Base from './base.js'

class Tag extends Base {
  /**
   * 新建标签
   *
   * @param info
   */
  async create(info): Promise<[boolean, any]> {
    const { name } = info

    const newTag: any = { name }

    // 补充所述bucket信息
    if (this.bucket) newTag.bucket = this.bucket.name

    // 查询是否已存在重复的标签
    let existTag = await this.byName(newTag.name)

    if (existTag) return [false, `已存在同名标签[name=${newTag.name}]`]

    return this.clTag
      .insertOne(newTag)
      .then((result) => [true, { id: result.insertedId }])
      .catch((err) => [false, err.message])
  }
  /**
   * 获得用户指定的集合分类对象
   */
  async byId(id: string) {
    const query: any = { _id: new ObjectId(id) }

    if (this.bucket) query.bucket = this.bucket.name

    const existTag = await this.clTag.findOne(query)

    return existTag
  }
  /**
   * 获得用户指定的集合分类对象
   */
  async byName(name: string) {
    const query: any = { name }

    if (this.bucket) query.bucket = this.bucket.name

    const existTag = await this.clTag.findOne(query)

    return existTag
  }
  /**
   * 列出所有标签
   *
   * @returns
   */
  async list(): Promise<[boolean, any]> {
    const query: any = {}

    if (this.bucket) query.bucket = this.bucket.name

    let tags = await this.clTag
      .find(query, { projection: { bucket: 0 } })
      .sort({ name: 1 })
      .toArray()
    return [true, tags]
  }
  /**
   * 删除标签
   *
   * @param tagId
   */
  async remove(tagId: string): Promise<[boolean, any]> {
    const query: any = { _id: new ObjectId(tagId) }

    // 补充所述bucket信息
    if (this.bucket) query.bucket = this.bucket.name

    return this.clTag
      .deleteOne(query)
      .then((result) => [true, { deletedCount: result.deletedCount }])
      .catch((err) => [false, err.message])
  }
}

export default Tag
