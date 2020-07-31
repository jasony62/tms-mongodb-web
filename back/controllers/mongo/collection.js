const { ResultData } = require('tms-koa')
const CollectionBase = require('../collectionBase')

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

module.exports = Collection
