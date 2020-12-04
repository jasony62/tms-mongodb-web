const Helper = require('./helper')
const modelColl = require('../models/mgdb/collection')

/** 数据库控制器辅助类 */
class CollectionHelper extends Helper {
  /**
   *  检查集合名是否合规
   */
  checkClName(clName) {
    let model = new modelColl()
    return model.checkClName(clName)
  }
  /**
   * 修改集合名称
   */
  async rename(db, clName, newName) {
    const { name: dbName, sysname } = db
    const client = this.mongoClient
    // 检查是否已存在同名集合
    let equalNameSum = await this.clMongoObj
      .find({ name: newName, database: dbName, type: 'collection' })
      .count()
    if (equalNameSum !== 0) return [false, '集合名修改失败！已存在同名集合']

    // 修改集合名
    const query = { name: clName, database: dbName, type: 'collection' }
    if (this.bucket) query.bucket = this.bucket.name
    let clDb = client.db(sysname).collection(clName)
    return clDb
      .rename(newName)
      .then(() => this.clMongoObj.updateOne(query, { $set: { name: newName } }))
      .then((rst) => [true, rst.result])
      .catch((err) => [false, err.message])
  }
}

module.exports = CollectionHelper
