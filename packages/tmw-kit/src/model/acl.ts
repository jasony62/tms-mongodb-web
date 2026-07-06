import Base from './base.js'
import { isFerretdb } from '../pg/pool.js'
import { MongoAclRepository, PgAclRepository } from '../repo/index.js'
import type { IAclRepository, AclTarget, AclUser, AclRight } from '../repo/interfaces.js'

class Acl extends Base {
  private get _aclRepo(): IAclRepository {
    return isFerretdb()
      ? new PgAclRepository()
      : new MongoAclRepository(this.mongoClient)
  }

  async add(
    target: AclTarget,
    user: AclUser,
    right: AclRight = []
  ): Promise<[boolean, any?]> {
    return this._aclRepo.add(target, user, right)
  }
  async remove(target: AclTarget, user: AclUser): Promise<[boolean, string?]> {
    return this._aclRepo.remove(target, user)
  }
  async update(
    target: AclTarget,
    user: AclUser,
    data: any
  ): Promise<[boolean, string?]> {
    return this._aclRepo.update(target, user, data)
  }
  async check(target: AclTarget, user: AclUser): Promise<string[] | null> {
    return this._aclRepo.check(target, user)
  }
  async clean(target: AclTarget): Promise<[boolean, string?]> {
    return this._aclRepo.clean(target)
  }
  async targetByUser(
    target: Partial<AclTarget>,
    user: AclUser
  ): Promise<{ [key: string]: string[] }> {
    return this._aclRepo.targetByUser(target, user)
  }
  async list(
    target: Partial<AclTarget>,
    options = { nonexistentAsFault: false }
  ): Promise<[boolean, string | any[]]> {
    return this._aclRepo.list(target, options)
  }
}

export default Acl
