const { Ctrl, ResultData, ResultFault } = require('tms-koa')
const fs = require('fs')

class PluginInfo extends Ctrl {
  constructor(...args) {
    super(...args)
  }
  /**
   * 获取集合页面插件
   */
  getPlugins() {
    let config = {}

    if (fs.existsSync(process.cwd() + '/config/plugins.js')) {
      let cf = require('../config/plugins')
      if (typeof cf === 'object') config = cf
    }

    return new ResultData(config)
  }
}

module.exports = PluginInfo
