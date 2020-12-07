const log4js = require('@log4js-node/log4js-api')
const logger = log4js.getLogger('tms-mongodb-web')
const path = require('path')
const glob = require('glob')
const { PluginBase } = require('./base')

const RequiredProps = ['name', 'scope', 'title', 'description']

let _pluginsByName = new Map() // 插件名称到插件示例

let _dbProfiles = [] // 数据库插件简要描述
let _clProfiles = [] // 集合插件简要描述
let _docProfiles = [] // 文档插件简要描述

class Context {
  get dbPlugins() {
    return _dbProfiles
  }
  get clPlugins() {
    return _clProfiles
  }
  get docPlugins() {
    return _docProfiles
  }
  byName(name) {
    return _pluginsByName.get(name)
  }
}
/**
 * 检查插件信息是否设置正确
 *
 * @param {string} file
 * @param {object} plugin
 */
async function checkPlugin(file, plugin) {
  let promises = RequiredProps.map((prop) => {
    return new Promise((resolve, reject) => {
      if (typeof plugin[prop] !== 'string' || !plugin[prop]) {
        logger.warn(
          `文件[${path.basename(file)}]创建的插件属性[${prop}]，不可用`
        )
        reject()
      } else {
        resolve()
      }
    })
  })
  return Promise.all(promises)
    .then(() => {
      let { scope } = plugin
      if (!['database', 'collection', 'document'].includes(scope)) {
        logger.warn(
          `文件[${path.basename(file)}]插件属性[scope=${scope}]无效，不可用`
        )
      }
    })
    .then(() => true)
    .catch(() => false)
}

Context.init = (function () {
  let _instance
  return async function (pluginConfig) {
    if (_instance) return _instance

    let { dir } = pluginConfig
    let absDir = path.resolve(process.cwd(), dir)
    logger.info(`从目录[${absDir}]读取插件`)
    let files = glob.sync(`${absDir}/*.js`)
    for (let i = 0, file; i < files.length; i++) {
      file = files[i]
      let { createPlugin } = require(file)
      if (!createPlugin || typeof createPlugin !== 'function') {
        logger.warn(
          `文件[${path.basename(file)}]没有导出'createPlugin'方法，不可用`
        )
        continue
      }
      let plugin = createPlugin()
      if (!plugin || !(plugin instanceof PluginBase)) {
        logger.warn(`文件[${path.basename(file)}]未创建插件对象，不可用`)
        continue
      }
      if (!plugin.execute || typeof plugin.execute !== 'function') {
        {
          logger.warn(
            `文件[${path.basename(file)}]创建的插件未包含'execute'方法，不可用`
          )
          continue
        }
      }
      let passed = await checkPlugin(file, plugin)
      if (passed) {
        let { name, scope } = plugin
        switch (scope) {
          case 'database':
            _dbProfiles.push(plugin.profile)
            break
          case 'collection':
            _clProfiles.push(plugin.profile)
            break
          case 'document':
            _docProfiles.push(plugin.profile)
            break
        }
        _pluginsByName.set(name, plugin)

        logger.info(`从文件[${path.basename(file)}]创建插件[name=${name}]`)
      }
    }

    _instance = new Context()

    return _instance
  }
})()

Context.ins = Context.init

module.exports = { Context }
