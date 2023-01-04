import Helper from 'tmw-kit/dist/ctrl/helper'

/**
 * 文档列定义控制器辅助类
 * @extends Helper
 */
class SchemaHelper extends Helper {
  /**
   * 新建文档列定义
   */
  async createCl(existDb, info) {
    info.type = 'schema'

    if (existDb) {
      info.database = existDb.name
      info.db = { sysname: existDb.sysname, name: existDb.name }
    }

    if (!info.scope) info.scope = 'document'
    if (typeof info.order !== 'number') info.order = 9999
    if (this.bucket) info.bucket = this.bucket.name

    return this.clMongoObj
      .insertOne(info)
      .then((result) => [true, result])
      .catch((err) => [false, err.message])
  }
}

export default SchemaHelper
