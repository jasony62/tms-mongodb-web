import fs from 'fs'
import path from 'path'
import _ from 'lodash'

let TMW_CONFIG
/**
 * 加载TMW扩展配置
 * @returns
 */
export async function loadTmwConfig() {
  if (TMW_CONFIG) return TMW_CONFIG

  let cnfpath = path.resolve(process.cwd() + '/config/app.js')
  if (fs.existsSync(cnfpath)) {
    TMW_CONFIG = (await import(process.cwd() + '/config/app.js')).default
      .tmwConfig
  } else {
    TMW_CONFIG = {
      TMW_APP_CREATETIME: 'TMW_CREATE_TIME',
      TMW_APP_UPDATETIME: 'TMW_UPDATE_TIME',
      TMW_APP_TAGS: 'TMW_TAGS', // 默认的数据标签字段
      TMW_APP_DATA_ACTION_LOG: 'N',
    }
  }

  return TMW_CONFIG
}
export function makeProjection(fields: any, fixed = { _id: 0 }) {
  return fields
    ? fields.split(',').reduce((result, field) => {
        result[field] = 1
        return result
      }, fixed)
    : null
}
/**
 * 按标签过滤条件
 */
export async function makeTagsFilter(tags: string | string[], filter?) {
  /* 包含全部标签 */
  if (tags && typeof tags === 'string') tags = tags.split(',')
  if (!Array.isArray(tags) || tags.length === 0) return null

  let tmwConfig = await loadTmwConfig()

  filter ??= {}
  if (!filter[tmwConfig.TMW_APP_TAGS])
    filter[tmwConfig.TMW_APP_TAGS] = {
      feature: 'all',
      keyword: tags,
    }

  return filter
}
/*
 * 加载配置文件
 *
 * @param {string} name - 配置名称
 * @param {object} defaultConfig - 默认配置
 *
 * @return {object} 配置数据对象
 */
export async function loadConfig(configDir, name, defaultConfig?) {
  let basepath = path.resolve(configDir, `${name}.js`)
  let baseConfig
  if (fs.existsSync(basepath)) {
    baseConfig = (await import(basepath)).default
  } else {
  }
  let localpath = path.resolve(configDir, `${name}.local.js`)
  let localConfig
  if (fs.existsSync(localpath)) {
    localConfig = (await import(localpath)).default
  }
  if (defaultConfig || baseConfig || localConfig) {
    return _.merge({}, defaultConfig, baseConfig, localConfig)
  }

  return false
}
