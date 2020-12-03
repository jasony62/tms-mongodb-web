const _ = require('tms-koa/node_modules/lodash')
const Path = require('path')
let commonConfig, sendConfig, receiveConfig, pluginConfig

const commonPath = Path.resolve(__dirname, '../controllers/plugins/')
function inintCommonConfig() {
  commonConfig = {
    db: [],
    collection: [],
    document: [
      {
        name: 'sync',
        title: '同步按钮',
        description: '请求外部接口',
        type: 'http',
        batch: ['all', 'filter', 'ids'],
        auth: ['*']
      },
      {
        name: 'demo',
        title: '内部按钮',
        description: '调用模块自身方法',
        type: 'native',
        batch: ['all', 'filter', 'ids'],
        auth: ['*']
      }
    ]
  }
}

function initSendConfig() {
  // 发送回调相对路径
  // const sendCBPath = Path.join(commonPath, 'sendCallback/')

  // 发送配置
  sendConfig = {
    sync: [
      { url: process.env.TMS_PLUGINS_IT_IP, methos: 'post' },
      { docSchemas: true, isNeedGetParams: true }
    ]
  }
}

function initReceiveConfig() {
  // 接收回调相对路径
  const receiveCBPath = Path.join(commonPath, 'receiveCallback/')

  // 接收配置-以模块划分
  receiveConfig = {
    // it模块每个会receiveCB接口都会包含event和eventType
    // callback: { path: `${receiveCBPath}/document`, callbackName: '' }
    it: [{ name: '**', event: '**', eventType: '**', quota: '**' }]
  }
}

inintCommonConfig()
initSendConfig()
initReceiveConfig()

pluginConfig = {
  commonConfig,
  sendConfig,
  receiveConfig
}

const fs = require('fs')
if (fs.existsSync(process.cwd() + '/config/plugin.local.js'))
  _.merge(pluginConfig, require(process.cwd() + '/config/plugin.local.js'))

module.exports = pluginConfig
