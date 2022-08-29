export * from './model'

import { Base, Helper } from './ctrl'

export { Base as CtrlBase, Helper as CtrlHelper }

import * as fs from 'fs'
import * as path from 'path'
import * as _ from 'lodash'

/*
 * 加载配置文件
 *
 * @param {string} name - 配置名称
 * @param {object} defaultConfig - 默认配置
 *
 * @return {object} 配置数据对象
 */
export function loadConfig(configDir, name, defaultConfig?) {
  let basepath = path.resolve(configDir, `${name}.js`)
  let baseConfig
  if (fs.existsSync(basepath)) {
    baseConfig = require(basepath)
  } else {
  }
  let localpath = path.resolve(configDir, `${name}.local.js`)
  let localConfig
  if (fs.existsSync(localpath)) {
    localConfig = require(localpath)
  }
  if (defaultConfig || baseConfig || localConfig) {
    return _.merge({}, defaultConfig, baseConfig, localConfig)
  }

  return false
}
