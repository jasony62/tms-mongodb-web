import mongodb from 'mongodb'
import { IAclRepository } from '../interfaces.js'
import type { AclTarget, AclUser, AclRight } from '../interfaces.js'

const META_ADMIN_DB = process.env.TMW_APP_META_ADMIN_DB || 'tms_admin'
const ACL_CL = 'mongodb_object_acl'

export class MongoAclRepository implements IAclRepository {
  private mongoClient: mongodb.MongoClient

  constructor(mongoClient: mongodb.MongoClient) {
    this.mongoClient = mongoClient
  }

  private get clAcl(): any {
    if (!this.mongoClient) {
      throw new Error(
        'MongoDB 客户端未初始化，请检查 mongodb 连接配置是否正确（host/port/user/password）以及数据库服务是否已启动。'
      )
    }
    return this.mongoClient.db(META_ADMIN_DB).collection(ACL_CL)
  }

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
      remark: user.remark,
    }
    const update = {
      $push: {
        acl: { user: validUser, right: [] },
      },
    }
    const result = await this.clAcl.updateOne(query, update, { upsert: true })
    const { upsertedCount, upsertedId, modifiedCount } = result
    if (upsertedCount === 1) {
      return [true, { id: upsertedId.toString() }]
    } else if (modifiedCount === 1) {
      return [true, { right: [] }]
    }

    return [false]
  }

  async remove(target: AclTarget, user: AclUser): Promise<[boolean, string?]> {
    const query = {
      'target.id': target.id,
      'target.type': target.type,
    }
    const update = {
      $pull: {
        acl: { 'user.id': user.id },
      },
    }
    const result = await this.clAcl.updateOne(query, update)
    const { modifiedCount, matchedCount } = result

    if (modifiedCount === 1) return [true]

    if (matchedCount === 0) return [false, '没有匹配的授权列表']

    return [false, '未执行删除授权操作，请检查数据是否有效']
  }

  async update(
    target: AclTarget,
    user: AclUser,
    data: any
  ): Promise<[boolean, string?]> {
    if (!data || typeof data !== 'object')
      return [false, '没有指定要更新的数据']

    const { right } = data

    const query = {
      'target.id': target.id,
      'target.type': target.type,
      acl: { $elemMatch: { 'user.id': user.id } },
    }

    const updated = {
      $set: {
        'acl.$.user.remark': user.remark,
        'acl.$.right': right,
      },
    }

    const result = await this.clAcl.updateOne(query, updated)
    const { modifiedCount, matchedCount } = result
    if (modifiedCount === 1) return [true]

    if (matchedCount === 0) return [false, '没有匹配的授权列表']

    return [false, '未执行更新授权操作，请检查数据是否有效']
  }

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

    if (result.length === 0) return { [target.type!]: [] }

    return { [target.type!]: result.map((acl: any) => acl.target.id) }
  }

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
