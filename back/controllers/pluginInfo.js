const { Ctrl, ResultData, ResultFault } = require('tms-koa')
const fs = require('fs')

class PluginInfo extends Ctrl {
  constructor(...args) {
    super(...args)
  }
  /**
   * @swagger
   *
   * /api/getPlugins:
   *   get:
   *     tags:
   *       - plugin
   *     summary: 获取集合页面插件
   *     description: 应该由接口commonExecute替代
   *     responses:
   *       '200':
   *         description: result为插件数组
   *     deprecated: true
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
