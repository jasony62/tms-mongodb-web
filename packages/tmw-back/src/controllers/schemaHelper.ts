import { ModelSchema } from 'tmw-kit'
import { Helper } from 'tmw-kit/dist/ctrl/index.js'

/**
 * 文档列定义控制器辅助类
 * @extends Helper
 */
class SchemaHelper extends Helper {
  constructor(ctrl: any) {
    super(ctrl)
  }
  get _modelSchema() {
    let model = new ModelSchema(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )
    return model
  }
  /**
   * 新建文档列定义
   */
  async createDocSchema(existDb, info) {
    info.type = 'schema'

    if (existDb) {
      info.db = { sysname: existDb.sysname, name: existDb.name }
    }

    if (!info.scope) info.scope = 'document'
    if (typeof info.order !== 'number') info.order = 99999
    if (this.bucketObj) info.bucket = this.bucketObj.name

    return this.clMongoObj
      .insertOne(info)
      .then((result) => [true, result])
      .catch((err) => [false, err.message])
  }
  /**
   * 按名称查找文档列定义
   */
  async schemaByName(info, scope = null, id = null) {
    const { name, db } = info

    const existSchema = await this._modelSchema.byName(name, {
      onlyProperties: false,
      dbName: db,
      scope,
    })

    if (existSchema && existSchema._id.toString() !== id)
      return [false, '已存在同名文档列定义']

    return [true]
  }
  /**
   * 根据id查找文档列定义
   */
  async schemaById(schema_id) {
    return this._modelSchema.bySchemaId(schema_id, { onlyProperties: false })
  }
  /**
   * 删除定义
   *
   * @param id
   */
  async removeById(id: string): Promise<[boolean, string | null]> {
    return this._modelSchema.removeById(id)
  }
  /**
   * 基本信息列表
   *
   * @param id
   */
  async listSimple(dbName: string, scope = 'document'): Promise<[any]> {
    return await this._modelSchema.listSimple(dbName, scope)
  }
}

export default SchemaHelper
