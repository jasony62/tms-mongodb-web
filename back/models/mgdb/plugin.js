const _ = require('lodash')
const { loadConfig } = require('tms-koa')

/**
 * Plugin配置
 */
class PluginConfig {}

PluginConfig.ins = (function () {
  let instance
  return function () {
    if (instance) return instance

    instance = new PluginConfig()
    const { commonConfig, sendConfig } = loadConfig('plugin')

    _.merge(instance, { commonConfig, sendConfig })

    return instance
  }
})()

module.exports = PluginConfig
