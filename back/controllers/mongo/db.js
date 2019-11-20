const { Ctrl, ResultData } = require('tms-koa')

class Bb extends Ctrl {
  list() {
    return new ResultData('所有的库')
  }
}
module.exports = Db
