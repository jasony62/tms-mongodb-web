const {
  ResultData,
  ResultFault
} = require('tms-koa')
const Base = require('../controllers/base')

class Examples extends Base {
  constructor(...args) {
    super(...args)
  }

  async examples() {
    return new ResultData('examples')
  }
}

module.exports = Examples