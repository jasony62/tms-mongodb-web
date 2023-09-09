import { ModelCl } from 'tmw-kit'
import { Helper } from 'tmw-kit/dist/ctrl'

/** 数据库控制器辅助类 */
class CollectionHelper extends Helper {
  /**
   * 修改集合名称
   */
  async rename(db, clName, newName) {
    const { name: dbName, sysname } = db
    const client = this.ctrl.mongoClient
    // 检查是否已存在同名集合
    let equalNameSum = await this.clMongoObj.countDocuments({
      name: newName,
      database: dbName,
      type: 'collection',
    })

    if (equalNameSum !== 0) return [false, '集合名修改失败！已存在同名集合']

    // 修改集合名
    const query: any = { name: clName, database: dbName, type: 'collection' }
    if (this.ctrl.bucketObj) query.bucket = this.ctrl.bucketObj.name
    let clDb = client.db(sysname).collection(clName)
    return clDb
      .rename(newName)
      .then(() => this.clMongoObj.updateOne(query, { $set: { name: newName } }))
      .then((rst) => [true, rst.result])
      .catch((err) => [false, err.message])
  }
  /**
   * 创建集合
   */
  async createCl(existDb, info) {
    let modelCl = new ModelCl(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )

    return await modelCl.create(existDb, info)
  }
}

export default CollectionHelper
