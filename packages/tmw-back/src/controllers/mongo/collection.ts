import { ResultData } from 'tms-koa'
import CollectionBase from '../collectionBase.js'

class Collection extends CollectionBase {
  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
  }
  /**
   * 删除指定数据库下的集合
   */
  async remove() {
    return new ResultData('删除指定数据库下的集合')
  }
}

export default Collection
