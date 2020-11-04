const _ = require('tms-koa/node_modules/lodash')
const Path = require('path')
const ip = process.env.TMS_PLUGINS_IT_IP || ''
let sendConfig,
    receiveConfig,
    pluginConfig

const commonPath = Path.resolve(__dirname, '../controllers/plugins/')
function initSendConfig() {
  // 发送回调相对路径
  // const sendCBPath = Path.join(commonPath, 'sendCallback/')

  // 发送配置
  sendConfig = {
    db: [],
    collection: [],
    document:  [
      [
        {url: '/module/api/**/**', method: 'post'}, { docSchemas: true, isNeedGetParams: true }, { name: '示例按钮', description: '示例描述', batch: ["all", "filter", "ids"], auth: ['*']}
      ],
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
    it: [
      { name: '**', event: '**', eventType: '**', quota: '**' },
    ]
  }
}


// 动态添加域名及模块名(模块名默认以第一个url中/it/之内的字符)
function initIpConfig(sendConfig) {
  Object.keys(sendConfig).forEach(key => {
    if (!sendConfig[key].length) return
    sendConfig[key].forEach(item => {
      if (!item.length || !item[0].url) return
      const module = item[0].url.split('/')[1].trim()
      const str = item[0].url.includes('?') ? '&' : '?'
      // 默认均采取异步加载方式
      const asyncVal = (/async=N|async=Y/i).test(item[0].url.split('?')[1]) ? '' : '&async=Y'
      item[0].url = ip + item[0].url + str + `module=${module}` + asyncVal

      // 默认权限放开*
      if (!item[2].auth || !item[2].auth.length)  item[2].auth = ['*']
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