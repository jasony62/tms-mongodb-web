import { ModelCl } from 'tmw-kit'
import { Helper } from 'tmw-kit/dist/ctrl/index.js'

/** 数据库控制器辅助类 */
class CollectionHelper extends Helper {
  constructor(ctrl: any) {
    super(ctrl)
  }
  get _modelCl() {
    let model = new ModelCl(
      this.ctrl.mongoClient,
      this.ctrl.bucket,
      this.ctrl.client
    )
    return model
  }
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
    return await this._modelCl.create(existDb, info)
  }
  /**
   * 删除集合
   */
  async removeCl(tmwDb, tmwCl) {
    let result = await this._modelCl.remove(tmwDb, tmwCl._id.toString())
    return result
  }
  /**
   * 获取数据库下的集合列表
   *
   * @param dbSysname
   * @param dirFullName
   * @param keyword
   * @param skip
   * @param limit
   */
  async list(
    dbSysname: string,
    dirFullName: string,
    keyword: string,
    skip: number,
    limit: number
  ) {
    let result = await this._modelCl.list(
      dbSysname,
      dirFullName,
      keyword,
      skip,
      limit
    )
    return result
  }
}

export default CollectionHelper
