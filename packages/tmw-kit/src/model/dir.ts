import Base from './base.js'
import { isFerretdb } from '../pg/pool.js'
import { MongoDirRepository, PgDirRepository } from '../repo/index.js'
import type { IDirRepository } from '../repo/interfaces.js'
/**
 * 分类目录名称命名规则
 */
const DIR_NAME_RE = '^[a-zA-Z]+[0-9a-zA-Z_-]{0,63}$'
/**
 * 集合分类目录
 */
class Dir extends Base {
  private get _dirRepo(): IDirRepository {
    return isFerretdb()
      ? new PgDirRepository()
      : new MongoDirRepository(this.mongoClient)
  }

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
    if (['collection', 'document'].indexOf(scope) === -1) {
      return [false, `不支持【${scope}】作为分类目录scope参数的值`]
    }

    // 检查指定的分类名
    let [passed, nameOrCause] = this.checkClName(info.name)
    if (passed === false) return [false, nameOrCause]

    // 查询是否已存在重复的集合分类
    const fullName = parentFullName ? `${parentFullName}/${info.name}` : info.name
    let existDir = await this.byFullName(existDb, fullName)
    if (existDir)
      return [
        false,
        `数据库[name=${existDb.name}]中，已存在同名分类目录[name=${fullName}]`,
      ]

    return this._dirRepo.create(existDb, info, parentFullName, scope, this.bucket?.name)
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
    return this._dirRepo.update(id, info)
  }
  /**
   * 删除集合分类
   *
   * @param existDb
   * @param id
   */
  async remove(existDb, id): Promise<[boolean, string | null]> {
    const existDir = await this._dirRepo.findById(id)
    if (!existDir) {
      return [false, '指定的分类目录不存在']
    }

    const children = await this.getChildren(existDb, existDir.full_name)
    if (children.length) {
      return [false, '分类目录有下级分类目录，不能删除']
    }

    return this._dirRepo.delete(id)
  }

  /**
   * 新建集合分类
   *
   * @param existDb
   * @param scope
   * @returns
   */
  async list(existDb, scope = 'collection'): Promise<[boolean, any]> {
    return this._dirRepo.list(existDb, scope)
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
    return this._dirRepo.findByFullName(db, fullName, scope, this.bucket?.name)
  }
  /**
   * 获得用户指定的集合分类的子分类对象
   * @param db
   * @param fullName
   * @param scope
   */
  async getChildren(db, fullName: string, scope = 'collection') {
    return this._dirRepo.listChildren(db, fullName, scope, this.bucket?.name)
  }
}

export default Dir
