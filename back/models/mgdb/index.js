const ObjectId = require('mongodb').ObjectId
const Base = require('./base')
const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const log4js = require('log4js')
const logger = log4js.getLogger('tms-mongodb-web')

function loadConfig(name, defaultConfig) {
  let basepath = path.resolve('config', `${name}.js`)
  let baseConfig
  if (fs.existsSync(basepath)) {
    baseConfig = require(basepath)
    logger.info(`从[${basepath}]加载配置`)
  } else {
    logger.warn(`[${name}]配置文件[${basepath}]不存在`)
  }
  let localpath = path.resolve('config', `${name}.local.js`)
  let localConfig
  if (fs.existsSync(localpath)) {
    localConfig = require(localpath)
    logger.info(`从[${localpath}]加载本地配置`)
  }
  if (defaultConfig || baseConfig || localConfig) {
    return _.merge({}, defaultConfig, baseConfig, localConfig)
  }

  return false
}

class Index extends Base {}

/**
 * Plugin配置
 */
class PluginConfig {}
PluginConfig.ins = (function() {
  let instance
  return function() {
    if (instance) return instance

    instance = new PluginConfig()
    const { db, collection, document } = loadConfig('plugin')
    
    Object.assign(instance, { db, collection, document })

    return instance
  }
})()

module.exports = { Index, PluginConfig }
