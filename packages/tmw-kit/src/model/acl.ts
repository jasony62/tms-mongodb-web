import Base from './base.js'

interface AclTarget {
  id: string
  type: string
}
interface AclUser {
  id: string
}
type AclRight = string[]
/**
 * 管理对象访问控制列表
 */
class Acl extends Base {
  /**
   * 添加访问控制
   *
   * 不检查重复添加情况
   *
   * @param target
   * @param user
   * @param right
   */
  async add(
    target: AclTarget,
    user: AclUser,
    right: AclRight = []
  ): Promise<[boolean, any?]> {
    const query = {
      'target.id': target.id,
      'target.type': target.type,
    }
    const validUser = {
      id: user.id,
    }
    const update = {
      $push: {
        acl: { user: validUser, right: [] },
      },
    }
    const result = await this.clAcl.updateOne(query, update, { upsert: true })
    const { upsertedCount, upsertedId, modifiedCount } = result
    if (upsertedCount === 1) {
      // 新建
      return [true, { id: upsertedId.toString() }]
    } else if (modifiedCount === 1) {
      // 修改
      return [true, { right: [] }]
    }

    return [false]
  }
  /**
   * 取消某个用户的授权
   *
   * @param target
   * @param user
   */
  async remove(target: AclTarget, user: AclUser): Promise<[boolean, string?]> {
    const query = {
      'target.id': target.id,
      'target.type': target.type,
    }
    const validUser = {
      id: user.id,
    }
    const update = {
      $pull: {
        acl: { user: validUser },
      },
    }
    const result = await this.clAcl.updateOne(query, update)
    const { modifiedCount, matchedCount } = result
    if (modifiedCount === 1) return [true]

    if (matchedCount === 0) return [false, '没有匹配的授权列表']

    /**
     * 如果列表中没有匹配的数据，也不会执行update
     */
    return [false, '未执行删除授权操作，请检查数据是否有效']
  }
  /**
   * 取消某个用户的授权
   *
   * @param target
   * @param user
   * @param data
   */
  async update(
    target: AclTarget,
    user: AclUser,
    data: any
  ): Promise<[boolean, string?]> {
    if (!data || typeof data !== 'object')
      return [false, '没有指定要更新的数据']

    const { right } = data
    if (!Array.isArray(right)) return [false, '没有指定要更新的权限数据']

    const query = {
      'target.id': target.id,
      'target.type': target.type,
      acl: { $elemMatch: { 'user.id': user.id } },
    }

    const updated = {
      $set: {
        'acl.$.right': right,
      },
    }

    const result = await this.clAcl.updateOne(query, updated)
    const { modifiedCount, matchedCount } = result
    if (modifiedCount === 1) return [true]

    if (matchedCount === 0) return [false, '没有匹配的授权列表']

    /**
     * 如果列表中没有匹配的数据，也不会执行update
     */
    return [false, '未执行更新授权操作，请检查数据是否有效']
  }
  /**
   *  检查是否有授权
   *
   * @param target
   * @param user
   * @returns 如果是null，说明没有授权；否则是权限列表，允许为空。
   */
  async check(target: AclTarget, user: AclUser): Promise<string[] | null> {
    const query = {
      'target.id': target.id,
      'target.type': target.type,
      acl: { $elemMatch: { 'user.id': user.id } },
    }
    const result = await this.clAcl.findOne(query, {
      projection: {
        acl: { $elemMatch: { 'user.id': user.id } },
      },
    })
    if (result === null) return result

    return result.acl[0]?.right
  }
  /**
   * 删除授权对象
   *
   * @param target
   * @returns
   */
  async clean(target: AclTarget): Promise<[boolean, string?]> {
    const query = {
      'target.id': target.id,
      'target.type': target.type,
    }

    const result = await this.clAcl.deleteOne(query)
    const { deletedCount } = result

    if (deletedCount === 1) return [true]

    return [false, '未执行清除授权对象操作，请检查数据是否有效']
  }
  /**
   * 获得授权用户可以访问的对象
   *
   * @param target
   * @param user
   * @returns
   */
  async targetByUser(
    target: Partial<AclTarget>,
    user: AclUser
  ): Promise<{ [key: string]: string[] }> {
    const query = {
      'target.type': target.type,
      acl: { $elemMatch: { 'user.id': user.id } },
    }

    const result = await this.clAcl
      .find(query, {
        projection: {
          _id: 0,
          'target.id': 1,
        },
      })
      .toArray()

    if (result.length === 0) return { [target.type]: [] }

    return { [target.type]: result.map((acl: any) => acl.target.id) }
  }
  /**
   * 获得指定对象的访问控制清单
   *
   * @param target
   * @param options
   * @returns
   */
  async list(
    target: Partial<AclTarget>,
    options = { nonexistentAsFault: false }
  ): Promise<[boolean, string | any[]]> {
    const query = {
      'target.id': target.id,
      'target.type': target.type,
    }

    const result = await this.clAcl.findOne(query, {
      projection: {
        _id: 0,
        acl: 1,
      },
    })

    if (!result) {
      if (options.nonexistentAsFault) return [false, '没有匹配的授权列表']
      return [true, []]
    }

    const { acl } = result

    if (acl.length === 0) return [true, []]

    return [true, acl]
  }
}

export default Acl
