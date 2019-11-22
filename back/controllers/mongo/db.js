const { Ctrl, ResultData } = require('tms-koa')

class Db extends Ctrl {
  list() {
    return new ResultData('所有的库')
  }
}
module.exports = Db
