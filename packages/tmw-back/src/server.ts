import log4js from 'log4js'
import path from 'path'
import fs from 'fs'
import { nanoid } from 'nanoid'

const cnfpath = path.resolve(process.cwd() + '/config/log4js.js')
if (fs.existsSync(cnfpath)) {
  const log4jsConfig = (await import(cnfpath)).default
  log4js.configure(log4jsConfig)
} else {
  log4js.configure({
    appenders: {
      consoleout: { type: 'console' },
    },
    categories: {
      default: {
        appenders: ['consoleout'],
        level: process.env.TMW_APP_LOG4JS_LEVEL || 'debug',
      },
    },
  })
}
const logger = log4js.getLogger('tms-mongodb-web')

import { TmsKoa, loadConfig } from 'tms-koa'
import { PluginContext } from 'tmw-kit'

const tmsKoa = new TmsKoa()

/**初始化配置上下文对象*/
async function loadPlugins() {
  let config = await loadConfig('plugin')
  PluginContext.init(config)
}
/**
 * 数据初始化
 */
async function dbInit(MongoContext) {
  let config = await loadConfig('dbinit')
  if (!config) return
  if (!Array.isArray(config.rules) || config.rules.length === 0) return

  const client = await MongoContext.mongoClient()

  logger.info('执行数据初始化', config)
  const { loadDataFrom } = await import('tmw-kit/dist/util/database.js')
  for (let rule of config.rules) {
    let { file, replaceExistingSchema, allowReuseSchema, docCreateMode } = rule

    if (!fs.existsSync(file)) continue

    await loadDataFrom(file, client, {
      replaceExistingSchema,
      allowReuseSchema,
      docCreateMode,
    })
  }
}

/**
 * 框架完成初始化
 */
async function afterInit({ MongoContext }) {
  logger.info('已完成框架初始化')
  /**
   * 数据加密基础key
   */
  if (!process.env.TMW_APP_DATA_CIPHER_KEY) {
    const filename = '.data-cipher.key'
    let key
    if (fs.existsSync(filename)) {
      key = fs.readFileSync(filename)
    } else {
      key = nanoid(16)
      // 保存到文件
      fs.writeFileSync(filename, key)
      console.warn('****请删除生成的密钥文件****')
    }
    process.env.TMW_APP_DATA_CIPHER_KEY = key
  }
  /**
   * 加载插件
   */
  loadPlugins()
  /**
   * 数据初始化
   */
  if (MongoContext) await dbInit(MongoContext)
}

// 捕获ctrl+c
process.on('SIGINT', () => {
  process.exit()
})
// 退出
process.on('exit', () => {
  logger.info('退出')
})

tmsKoa.startup({ afterInit })
