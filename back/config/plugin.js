let pluginConfig = {
  db: [],
  collection: [],
  document:  [
    [
      'plugins/examples', { batch: ["all", "filter", "ids"] }, { name: '插件示例一', description: '插件示例一' }
    ]
  ]
}

const fs = require('fs')
if (fs.existsSync(process.cwd() + "/config/plugin.local.js")) Object.assign(pluginConfig, require(process.cwd() + "/config/plugin.local.js"))

module.exports = pluginConfig