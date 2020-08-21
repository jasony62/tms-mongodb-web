let pluginConfig = {
  db: [],
  collection: [],
  document:  [
    [
      {url: 'http://localhost:3000/api/mongo/document/updateMany', method: 'post'}, {  }, { name: '插件示例一', description: '插件示例一', batch: ["all", "filter", "ids"] }
    ]
  ]
}

const fs = require('fs')
if (fs.existsSync(process.cwd() + "/config/plugin.local.js")) Object.assign(pluginConfig, require(process.cwd() + "/config/plugin.local.js"))

module.exports = pluginConfig