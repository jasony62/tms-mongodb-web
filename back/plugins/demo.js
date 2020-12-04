const { ResultFault, ResultData } = require('tms-koa')

function modules(name) {
  return new ResultData(name)
}
module.exports = modules
