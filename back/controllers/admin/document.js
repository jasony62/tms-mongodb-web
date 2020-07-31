const { ResultData } = require('tms-koa')
const DocBase = require('../documentBase')

class Document extends DocBase {
  constructor(...args) {
    super(...args)
  }
  //
  bulk() {
    return new ResultData('指定数据库下批量新建文档')
  }
}
module.exports = Document
