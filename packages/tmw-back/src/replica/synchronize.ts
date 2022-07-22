/**
 * 根据replica_map集合中的记录，进行全量数据同步
 */
import * as log4js from 'log4js'
import * as path from 'path'
import * as fs from 'fs'
let cnfpath = path.resolve(process.cwd() + '/config/log4js.js')
if (fs.existsSync(cnfpath)) {
  const log4jsConfig = require(process.cwd() + '/config/log4js')
  log4js.configure(log4jsConfig)
} else {
  log4js.configure({
    appenders: {
      consoleout: { type: 'console' },
    },
    categories: {
      default: {
        appenders: ['consoleout'],
        level: 'debug',
      },
    },
  })
}
const logger = log4js.getLogger('tmw-replica-sync')

import { loadConfig, Context } from 'tms-koa'
const { MongodbContext } = Context

import { ModelReplicaMap } from 'tmw-model'

function getMongoClient() {
  const config = loadConfig('mongodb')
  return MongodbContext.init(config).then(() => MongodbContext.mongoClient())
}

/**同步所有数据 */
async function syncAll() {
  const mongoClient = await getMongoClient()
  const rmCl = mongoClient.db('tms_admin').collection('replica_map')
  const rms = await rmCl.find().toArray()
  logger.info(`集合[tms_admin.replica_map]中包含[${rms.length}]条集合复制关系`)
  if (rms.length === 0) return

  const modelRM = new ModelReplicaMap(mongoClient)

  let syncCount = 0
  let rm
  for (let i = 0; i < rms.length && (rm = rms[i]); i++) {
    let [valid, cause] = modelRM.check(rm)
    if (false === valid) {
      logger.warn(`集合复制关系数据不合规[${cause}]`)
      continue
    }
    syncCount++
    let { primary, secondary } = rm
    logger.info(
      `[${i}]开始从集合[${primary.db}.${primary.cl}]向集合[${secondary.db}.${secondary.cl}]同步数据`
    )
    let { replacedCount, deletedCount } = await modelRM.synchronize(
      primary,
      secondary,
      {}
    )
    logger.info(
      `[${i}]完成从集合[${primary.db}.${primary.cl}]向集合[${secondary.db}.${secondary.cl}]同步数据[replacedCount=${replacedCount}][deletedCount=${deletedCount}]`
    )
  }
  logger.info(`完成[${syncCount}]条集合复制关系同步`)

  return syncCount
}

syncAll().then((syncCount) => {
  logger.info('退出')
  process.send({ syncCount })
  process.exit(0)
})
