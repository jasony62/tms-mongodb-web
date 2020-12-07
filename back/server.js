const log4jsConfig = require('./config/log4js')
const log4js = require('log4js')
log4js.configure(log4jsConfig)
const logger = log4js.getLogger('tms-mongodb-web')
const PluginContext = require('./models/plugin/context').Context

const { TmsKoa, loadConfig } = require('tms-koa')
const tmsKoa = new TmsKoa()

function loadPlugins() {
  let config = loadConfig('plugin2')
  PluginContext.init(config)
}
/**
 * 框架完成初始化
 *
 * @param {object} context
 */
function afterInit(context) {
  logger.info('已完成初始化')
  /**
   * 加载插件
   */
  loadPlugins(context)
}

tmsKoa.startup({ afterInit })
