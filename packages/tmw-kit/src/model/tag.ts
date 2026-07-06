import Base from './base.js'
import { isFerretdb } from '../pg/pool.js'
import { MongoTagRepository, PgTagRepository } from '../repo/index.js'
import type { ITagRepository } from '../repo/interfaces.js'

class Tag extends Base {
  private get _tagRepo(): ITagRepository {
    return isFerretdb()
      ? new PgTagRepository()
      : new MongoTagRepository(this.mongoClient, this.bucket)
  }

  async create(info: { name: string; bucket?: string }) {
    return this._tagRepo.create(info)
  }

  async update(id: string, bucketName: string | undefined, info: any) {
    return this._tagRepo.update(id, bucketName, info)
  }

  async remove(name: string, bucketName?: string) {
    return this._tagRepo.remove(name, bucketName)
  }

  async findByName(name: string, bucketName?: string) {
    return this._tagRepo.findByName(name, bucketName)
  }

  async list(bucketName?: string) {
    return this._tagRepo.list(bucketName)
  }

  async checkInUse(name: string) {
    return this._tagRepo.checkInUse(name)
  }
}

export default Tag
