const ip = process.env.TMS_PLUGINS_IP || ''
let pluginConfig = {
  db: [],
  collection: [],
  document:  [
    [
      {url: '/api/mongo/document/updateMany', method: 'post'}, {  }, { name: '插件示例一', description: '插件示例一', batch: ["all", "filter", "ids"] }
    ]
  ]
}

Object.keys(pluginConfig).forEach(key => {
  if(pluginConfig[key].length) {
    pluginConfig[key].forEach(item => {
      if(item.length && item[0].url) item[0].url = ip + item[0].url
    })
  }
})

const fs = require('fs')
if (fs.existsSync(process.cwd() + "/config/plugin.local.js")) Object.assign(pluginConfig, require(process.cwd() + "/config/plugin.local.js"))

module.exports = pluginConfig