import { ObjectId } from 'mongodb'
import Base from './base.js'
/**
 * 集合分类目录
 */
class CollectionDir extends Base {
  /**
   * 新建集合分类
   *
   * @param existDb
   * @param info
   * @returns
   */
  async create(
    existDb,
    info,
    parentFullName?: string
  ): Promise<[boolean, any]> {
    const { name, title, description, order = 99 } = info
    const newClDir: any = { name, title, description, order }
    // 补充所述数据库信息
    newClDir.db = { sysname: existDb.sysname, name: existDb.name }
    // 补充所述bucket信息
    if (this.bucket) newClDir.bucket = this.bucket.name

    newClDir.full_name = parentFullName ? `${parentFullName}/${name}` : name
    newClDir.level = newClDir.full_name.split('/').length

    // 检查指定的分类名
    // let [passed, nameOrCause] = this.checkClName(info.name)
    // if (passed === false) return [false, nameOrCause]
    // info.name = nameOrCause

    // 查询是否已存在重复的集合分类
    // let existTmwCl = await this.byName(existDb, info.name)
    // if (existTmwCl)
    //   return [
    //     false,
    //     `数据库[name=${existDb.name}]中，已存在同名集合[name=${info.name}]`,
    //   ]

    return this.clCollectionDir
      .insertOne(newClDir)
      .then((result) => [true, result])
      .catch((err) => [false, err.message])
  }
  /**
   * 更新指定数据库下的集合分类
   *
   * @param tmwDb
   * @param existCl
   * @param info
   * @returns
   */
  async update(tmwDb, id, info) {
    const { title, description, order = 99 } = info
    const newClDir: any = { title, description, order }
    return this.clCollectionDir
      .updateOne({ _id: new ObjectId(id) }, { $set: newClDir })
      .then((result) => [true, result])
      .catch((err) => [false, err.message])
  }
  /**
   * 删除集合分类
   *
   * @param existDb
   * @param id
   */
  async remove(existDb, id): Promise<[boolean, string | null]> {
    return this.clCollectionDir
      .deleteOne({ _id: new ObjectId(id) })
      .then(() => [true])
      .catch((err) => [false, err.message])
  }

  /**
   * 新建集合分类
   *
   * @param existDb
   * @param info
   * @returns
   */
  async list(existDb): Promise<[boolean, any]> {
    let dirs = await this.clCollectionDir
      .find({ 'db.name': existDb.name }, { projection: { db: 0 } })
      .sort({ level: 1, order: 1 })
      .toArray()
    return [true, dirs]
  }
}

export default CollectionDir
