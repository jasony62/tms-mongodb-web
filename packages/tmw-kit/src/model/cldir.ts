import { ObjectId } from 'mongodb'
import Base from './base.js'

/**
 * 保存元数据的数据库
 */
const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'

const CLDIR_NAME_RE = '^[a-zA-Z]+[0-9a-zA-Z_-]{0,63}$'
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
    let [passed, nameOrCause] = this.checkClName(name)
    if (passed === false) return [false, nameOrCause]

    // 查询是否已存在重复的集合分类
    let existClDir = await this.byFullName(existDb, newClDir.full_name)
    if (existClDir)
      return [
        false,
        `数据库[name=${existDb.name}]中，已存在同名集合分类[name=${newClDir.full_name}]`,
      ]

    return this.clCollectionDir
      .insertOne(newClDir)
      .then((result) => [true, result])
      .catch((err) => [false, err.message])
  }
  /**
   * 更新指定数据库下的集合分类
   * 只会修改title,description,order字段，其它字段忽略
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
    const clDir = await this.clCollectionDir.findOne({ _id: new ObjectId(id) })
    if (!clDir) {
      return [false, '指定的集合分类不存在']
    }

    const children = await this.getChildren(existDb, clDir.full_name)
    if (children.length) {
      return [false, '集合分类有下级集合分类，不能删除']
    }

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
  /**
   *  检查集合名
   */
  checkClName(clDirName) {
    if (new RegExp(CLDIR_NAME_RE).test(clDirName) !== true)
      return [
        false,
        '集合分类名必须以英文字母开头，仅限英文字母或_或-或数字组合，且最长64位',
      ]

    return [true, clDirName]
  }
  /**
   * 获得用户指定的集合分类对象
   *
   * @param {object|string} db - 集合所属数据库
   * @param {string} clName - 用户指定集合名称
   *
   * @returns {object} 集合对象
   */
  async byFullName(db, fullName: string) {
    const query: any = { full_name: fullName }

    if (typeof db === 'object') query['db.sysname'] = db.sysname
    else if (typeof db === 'string') query['db.name'] = db

    if (this.bucket) query.bucket = this.bucket.name

    const clDir = await this.clCollectionDir.findOne(query)

    return clDir
  }
  /**
   * 获得用户指定的集合分类的子分类对象
   * @param db
   * @param fullName
   */
  async getChildren(db, fullName: string) {
    const query: any = {
      full_name: { $regex: new RegExp('^' + fullName + '/') },
    }

    if (typeof db === 'object') query['db.sysname'] = db.sysname
    else if (typeof db === 'string') query['db.name'] = db

    if (this.bucket) query.bucket = this.bucket.name

    const clDirs = await this.clCollectionDir.find(query).toArray()

    return clDirs
  }
}

export default CollectionDir
