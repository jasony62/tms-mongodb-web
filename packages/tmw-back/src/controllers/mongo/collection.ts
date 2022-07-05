import { ResultData } from 'tms-koa'
import CollectionBase from '../collectionBase'

class Collection extends CollectionBase {
  constructor(...args) {
    super(...args)
  }
  /**
   * 删除指定数据库下的集合
   */
  async remove() {
    return new ResultData('删除指定数据库下的集合')
  }
}

export default Collection
