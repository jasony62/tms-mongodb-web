import { ObjectId } from 'mongodb'
import Base from './base.js'
/**
 * 分类目录名称命名规则
 */
const DIR_NAME_RE = '^[a-zA-Z]+[0-9a-zA-Z_-]{0,63}$'
/**
 * 集合分类目录
 */
class Dir extends Base {
  /**
   * 新建分类
   *
   * @param existDb
   * @param info
   * @param parentFullName
   * @param scope
   * @returns
   */
  async create(
    existDb,
    info,
    parentFullName?: string,
    scope = 'collection'
  ): Promise<[boolean, any]> {
    const { name, title, description, order = 99 } = info
    if (['collection', 'document'].indexOf(scope) === -1) {
      return [false, `不支持【${scope}】作为分类目录scope参数的值`]
    }
    const newDir: any = { name, title, scope, description, order }
    // 补充所述数据库信息
    newDir.db = { sysname: existDb.sysname, name: existDb.name }
    // 补充所述bucket信息
    if (this.bucket) newDir.bucket = this.bucket.name

    newDir.full_name = parentFullName ? `${parentFullName}/${name}` : name
    newDir.level = newDir.full_name.split('/').length

    // 检查指定的分类名
    let [passed, nameOrCause] = this.checkClName(name)
    if (passed === false) return [false, nameOrCause]

    // 查询是否已存在重复的集合分类
    let existDir = await this.byFullName(existDb, newDir.full_name)
    if (existDir)
      return [
        false,
        `数据库[name=${existDb.name}]中，已存在同名分类目录[name=${newDir.full_name}]`,
      ]

    return this.clDir
      .insertOne(newDir)
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
    const newDir: any = { title, description, order }
    return this.clDir
      .updateOne({ _id: new ObjectId(id) }, { $set: newDir })
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
    const existDir = await this.clDir.findOne({ _id: new ObjectId(id) })
    if (!existDir) {
      return [false, '指定的分类目录不存在']
    }

    const children = await this.getChildren(existDb, existDir.full_name)
    if (children.length) {
      return [false, '分类目录有下级分类目录，不能删除']
    }

    return this.clDir
      .deleteOne({ _id: new ObjectId(id) })
      .then(() => [true])
      .catch((err) => [false, err.message])
  }

  /**
   * 新建集合分类
   *
   * @param existDb
   * @param scope
   * @returns
   */
  async list(existDb, scope = 'collection'): Promise<[boolean, any]> {
    let dirs = await this.clDir
      .find({ 'db.name': existDb.name, scope }, { projection: { db: 0 } })
      .sort({ level: 1, order: 1 })
      .toArray()
    return [true, dirs]
  }
  /**
   *  检查集合名
   */
  checkClName(clDirName) {
    if (new RegExp(DIR_NAME_RE).test(clDirName) !== true)
      return [
        false,
        '分类目录名必须以英文字母开头，仅限英文字母或_或-或数字组合，且最长64位',
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
  async byFullName(db, fullName: string, scope = 'collection') {
    const query: any = { full_name: fullName, scope }

    if (typeof db === 'object') query['db.sysname'] = db.sysname
    else if (typeof db === 'string') query['db.name'] = db

    if (this.bucket) query.bucket = this.bucket.name

    const existDir = await this.clDir.findOne(query)

    return existDir
  }
  /**
   * 获得用户指定的集合分类的子分类对象
   * @param db
   * @param fullName
   * @param scope
   */
  async getChildren(db, fullName: string, scope = 'collection') {
    const query: any = {
      full_name: { $regex: new RegExp('^' + fullName + '/') },
      scope,
    }

    if (typeof db === 'object') query['db.sysname'] = db.sysname
    else if (typeof db === 'string') query['db.name'] = db

    if (this.bucket) query.bucket = this.bucket.name

    const dirs = await this.clDir.find(query).toArray()

    return dirs
  }
}

export default Dir
