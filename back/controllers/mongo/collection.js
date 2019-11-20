const { Ctrl, ResultData } = require('tms-koa')

class Collection extends Ctrl {
  list() {
    return new ResultData('指定库下所有的集合')
  }
  create() {
    return new ResultData('指定数据库下新建集合')
  }
  remove() {
    return new ResultData('删除指定数据库下的集合')
  }
}
module.exports = Collection
