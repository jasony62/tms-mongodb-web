const _ = require('tms-koa/node_modules/lodash')
const ip = process.env.TMS_PLUGINS_IP || ''
let sendConfig,
  receiveConfig,
  pluginConfig

function initSendConfig() {
  // 发送回调相对路径
  const sendCBPath = './plugins/sendCallback'

  // 发送配置
  sendConfig = {
    db: [],
    collection: [],
    document: [
      [
        { url: '/it/api/checkApi/createAccount?async=Y', method: 'post' },
        { docSchemas: false, isNeedGetParams: true },
        { name: '申请开通账号', description: '申请开通账号', batch: ['all', 'filter', 'ids'], auth: '*' }
      ],
    ]
  }
}

function initReceiveConfig() {
  // 接收回调相对路径
  const receiveCBPath = './plugins/receiveCallback'

  // 接收配置-以模块划分
  receiveConfig = {
    // it模块每个会receiveCB接口都会包含event和eventType
    // callback: { path: `${receiveCBPath}/document`, callbackName: '' } 
    it: [
      { name: '申请开通账号', event: 'createAccount', eventType: 'create' },
    ]
  }
}


// 动态添加域名及模块名(模块名默认以第一个url中/it/之内的字符)
function initIpConfig(sendConfig) {
  Object.keys(sendConfig).forEach(key => {
    if (!sendConfig[key].length) return
    sendConfig[key].forEach(item => {
      if (!item.length || !item[0].url) return
      let module = item[0].url.split('/')[1].trim()
      let str = item[0].url.includes('?') ? '&' : '?'
      item[0].url = ip + item[0].url + str + `module=${module}`
    })
  })
}

initSendConfig()
initReceiveConfig()
initIpConfig(sendConfig)

pluginConfig = {
  sendConfig,
  receiveConfig
}

const fs = require('fs')
if (fs.existsSync(process.cwd() + "/config/plugin.local.js")) _.merge(pluginConfig, require(process.cwd() + "/config/plugin.local.js"))

module.exports = pluginConfig