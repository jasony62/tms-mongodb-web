const { Ctrl } = require('tms-koa')
const Helper = require('./helper')

class Base extends Ctrl {
  constructor(...args) {
    super(...args)
    this.helper = new Helper(this)
  }
  async tmsBeforeEach() {
    this.clPreset = this.helper.clPreset
  }
}

module.exports = Base
