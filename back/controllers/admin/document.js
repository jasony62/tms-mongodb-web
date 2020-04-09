const { ResultData, ResultFault } = require('tms-koa')
const DocBase = require('../documentBase')

const log4js = require('log4js')
const logger = log4js.getLogger('tms-xlsx-etd')

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
