const { Ctrl, ResultData, ResultFault } = require('tms-koa')
const fs = require('fs')

class PluginInfo extends Ctrl {
  constructor(...args) {
    super(...args)
  }
  /**
   * 获取所有插件
   */
  getPlugins() {
    if (!fs.existsSync(process.cwd() + "/config/plugins.js")) {
        return new ResultFault("尚未配置任何插件")
    }
    const config = require('../config/plugins')
    
    return new ResultData(config)
  }
}

module.exports = PluginInfo