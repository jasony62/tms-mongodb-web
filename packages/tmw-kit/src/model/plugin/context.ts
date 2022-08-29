const log4js = require('@log4js-node/log4js-api')
const logger = log4js.getLogger('tms-mongodb-web')
const path = require('path')
const glob = require('glob')

import { PluginBase } from './base'
import { PluginProfile } from 'tmw-data'

let _pluginsByName = new Map<string, PluginBase>() // 插件名称到插件示例

let _dbProfiles: PluginProfile[] = [] // 数据库插件简要描述
let _clProfiles: PluginProfile[] = [] // 集合插件简要描述
let _docProfiles: PluginProfile[] = [] // 文档插件简要描述

/**
 * 检查插件信息是否设置正确
 *
 * @param {PluginBase} plugin
 */
function validatePlugin(plugin: PluginBase) {
  return plugin
    .validate()
    .then(() => {
      return true
    })
    .catch((reason) => {
      logger.warn(reason)
      return false
    })
}

export class Context {
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

  static init = (function () {
    let _instance
    return async function (pluginConfig?): Promise<Context> {
      if (_instance) return _instance

      if (!pluginConfig?.dir) {
        _instance = new Context()
        return _instance
      }

      let { dir } = pluginConfig
      const dirAry = dir.split(',')
      logger.info(`读取插件配置[${dirAry}]`)
      dirAry.forEach(async (dir) => {
        dir = dir.trim()
        if (dir === '') return
        let absDir = path.resolve(process.cwd(), dir)
        logger.info(`从目录[${absDir}]读取插件文件`)
        let files = glob.sync(`${absDir}/*.js`)
        for (let i = 0, file; i < files.length; i++) {
          file = files[i]
          let { createPlugin } = require(file)
          if (typeof createPlugin !== 'function') {
            logger.warn(
              `插件文件[${path.basename(
                file
              )}]不可用，没有导出[createPlugin]方法`
            )
            continue
          }

          // 支持用1个插件文件创建多个插件实例
          let plugin: PluginProfile = createPlugin(path.basename(file))

          let plugins = Array.isArray(plugin) ? plugin : [plugin]
          for (let p = 0; p < plugins.length; p++) {
            let onePlugin = plugins[p]
            if (!onePlugin || !(onePlugin instanceof PluginBase)) {
              logger.warn(
                `插件文件[${path.basename(file)}]不可用，未创建插件对象`
              )
              continue
            }
            if (onePlugin.disabled === true) {
              logger.warn(`插件文件[${onePlugin.file}]已禁用`)
              continue
            }
            let passed = await validatePlugin(onePlugin)
            if (passed) {
              if (_pluginsByName.has(onePlugin.name)) {
                logger.warn(
                  `插件文件[${onePlugin.file}]不可用，已有同名插件[name=${onePlugin.name}]`
                )
                continue
              }
              let { name, scope } = onePlugin
              switch (scope) {
                case 'database':
                  _dbProfiles.push(onePlugin.profile)
                  break
                case 'collection':
                  _clProfiles.push(onePlugin.profile)
                  break
                case 'document':
                  _docProfiles.push(onePlugin.profile)
                  break
              }
              _pluginsByName.set(name, onePlugin)

              logger.info(`从文件[${onePlugin.file}]创建插件[name=${name}]`)
            }
          }
        }
      })

      _instance = new Context()

      return _instance
    }
  })()

  static ins = Context.init
}
