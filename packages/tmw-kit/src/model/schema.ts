import mongodb from 'mongodb'
import Base from './base.js'
import ModelDb from './db.js'
import { isFerretdb } from '../pg/pool.js'
import { MongoSchemaRepository, PgSchemaRepository } from '../repo/index.js'
import type { ISchemaRepository } from '../repo/interfaces.js'

const ObjectId = mongodb.ObjectId

class Schema extends Base {
  private get _schemaRepo(): ISchemaRepository {
    return isFerretdb()
      ? new PgSchemaRepository()
      : new MongoSchemaRepository(this.mongoClient)
  }

  get _modelDb() {
    const model = new ModelDb(this.mongoClient, this.bucket, this.client)
    return model
  }
  /**
   * 根据ID获得字段定义
   */
  async bySchemaId(id, { onlyProperties = true } = {}) {
    const schema = await this._schemaRepo.findById(id, this.bucket?.name)
    if (!schema) return false

    //检查访问db的权限
    if (schema.db?.name) {
      const db = await this._modelDb.byName(schema.db.name)
      if (!db) throw Error('数据错误，文档定义所属数据库不存在')
      // 如果没有通过，会抛出异常
      await this._modelDb.checkAcl(db)
    }

    if (onlyProperties === true) return schema.body?.properties

    return schema
  }
  /**
   * 根据ID获得字段定义
   *
   * @param ids ObjectId数组
   * @param options
   * @returns
   */
  async bySchemaIds(ids: [], options = {}) {
    return this._schemaRepo.findByIds(ids, options)
  }
  /**
   * 根据名称获得字段定义
   * @param {string} name
   */
  async byName(
    name: string,
    { onlyProperties = true, dbName = null, scope = 'document' } = {}
  ) {
    const schema = await this._schemaRepo.findByName(name, {
      dbName,
      scope,
      bucket: this.bucket?.name,
    })
    if (!schema) return false

    //@TODO 应该检查db的权限

    if (onlyProperties === true) return schema.body?.properties

    return schema
  }
  /**
   * 删除文档列定义
   *
   * @param id
   * @returns
   */
  async removeById(id: string): Promise<[boolean, string | null]> {
    // 是否正在使用
    let rst = await this.clMongoObj.findOne({
      schema_id: id,
      type: 'collection',
    })
    if (rst) {
      return [
        false,
        `文档列定义正在被[${rst.database}]数据库中的[${rst.name}]集合使用，不能删除`,
      ]
    }

    const ok = await this._schemaRepo.deleteById(id, this.bucket?.name)
    return ok ? ([true, null] as [boolean, string | null]) : [false, '删除失败']
  }
  /**
   * 简单信息列表，不包含schema定义
   */
  async listSimple(dbName: string, scope = 'document') {
    return this._schemaRepo.listSimple(dbName, scope, this.bucket?.name)
  }
}

export default Schema
