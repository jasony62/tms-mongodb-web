const { Ctrl, ResultData } = require('tms-koa')

class Document extends Ctrl {
  list() {
    return new ResultData('指定数据库指定集合下的文档')
  }
  create() {
    return new ResultData('指定数据库指定集合下新建文档')
  }
  bulk() {
    return new ResultData('指定数据库下批量新建文档')
  }
  remove() {
    return new ResultData('删除指定数据库指定集合下的文档')
  }
  update() {
    return new ResultData('更新指定数据库指定集合下的文档')
  }
}
module.exports = Document
