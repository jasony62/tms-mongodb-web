const _ = require('tms-koa/node_modules/lodash')
const Path = require('path')
let commonConfig, sendConfig, pluginConfig

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
      { url: process.env.TMS_PLUGINS_SEND_IP, methos: 'post' },
      { docSchemas: true, isNeedGetParams: true }
    ]
  }
}

inintCommonConfig()
initSendConfig()

pluginConfig = {
  commonConfig,
  sendConfig
}

const fs = require('fs')
if (fs.existsSync(process.cwd() + '/config/plugin.local.js'))
  _.merge(pluginConfig, require(process.cwd() + '/config/plugin.local.js'))

module.exports = pluginConfig
