import * as log4js from 'log4js'
import * as path from 'path'
import * as fs from 'fs'
let cnfpath = path.resolve(process.cwd() + '/config/log.js')
if (fs.existsSync(cnfpath)) {
  const { default: log4jsConfig } = await import(
    process.cwd() + '/config/log4js'
  )
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
const logger = log4js.getLogger('tmw-replica-watch')

import { loadConfig, Context } from 'tms-koa'
const { MongodbContext } = Context

// 记录正在执行复制
const ChangeStreamByReplicaId = new Map()

/**返回MongoDB连接 */
function getMongoClient() {
  const config = loadConfig('mongodb')
  return MongodbContext.init(config).then(() => MongodbContext.mongoClient())
}
/**
 * 监听集合的变化
 */
async function newReplicaWatcher(mongoClient, pri, sec) {
  const priCl = mongoClient.db(pri.db).collection(pri.cl)
  const secCl = mongoClient.db(sec.db).collection(sec.cl)

  // 主集合监听器
  const priCs = priCl.watch([], { fullDocument: 'updateLookup' })

  logger.debug(`开始监听[${pri.db}.${pri.cl}][${sec.db}.${sec.cl}]`)

  priCs.on('change', (csEvent) => {
    const { operationType, ns } = csEvent
    if (operationType === 'insert') {
      let { _id, ...doc } = csEvent.fullDocument
      doc.__pri = { db: ns.db, cl: ns.coll, id: _id, time: Date.now() }
      secCl.insertOne(doc)
    } else if (operationType === 'update' || operationType === 'replace') {
      if (csEvent.fullDocument) {
        let { _id, ...doc } = csEvent.fullDocument
        doc.__pri = { db: ns.db, cl: ns.coll, id: _id, time: Date.now() }
        secCl.replaceOne({ '__pri.id': _id }, doc)
      }
    } else if (operationType === 'delete') {
      let { _id } = csEvent.documentKey
      secCl.deleteOne({ '__pri.id': _id })
    } else if (operationType === 'invalidate') {
      logger.debug('invalidate', csEvent)
    }
  })
  priCs.on('close', () => {
    logger.debug(`关闭监听[${pri.db}.${pri.cl}][${sec.db}.${sec.cl}]`)
  })
  priCs.on('end', () => {
    logger.debug(`结束监听[${pri.db}.${pri.cl}][${sec.db}.${sec.cl}]`)
  })

  return priCs
}
let ReplicaMapWatcher // 复制关系表监听器
/**
 * 监听replica_map集合，动态增删复制监听器
 */
async function watchReplicaMap(mongoClient) {
  logger.info('开始监听[replica_map]')
  const cl = mongoClient.db('tms_admin').collection('replica_map')
  ReplicaMapWatcher = cl.watch([], { fullDocument: 'updateLookup' })
  ReplicaMapWatcher.on('change', async (csEvent) => {
    const { operationType } = csEvent
    let strId = csEvent.documentKey._id.toHexString()
    if (operationType === 'insert') {
      let { primary, secondary } = csEvent.fullDocument
      newReplicaWatcher(mongoClient, primary, secondary).then((watcher) => {
        ChangeStreamByReplicaId.set(strId, watcher)
      })
    } else if (operationType === 'update' || operationType === 'replace') {
    } else if (operationType === 'delete') {
      let watcher = ChangeStreamByReplicaId.get(strId)
      if (watcher) {
        ChangeStreamByReplicaId.delete(strId)
        watcher.close()
      }
    } else if (operationType === 'invalidate') {
    }
  })
  ReplicaMapWatcher.on('close', () => {
    logger.info('关闭监听[replica_map]')
  })
  ReplicaMapWatcher.on('end', () => {
    logger.info('结束监听[replica_map]')
  })

  return true
}
/**
 * 启动replica_map集合中已有的复制监听器
 */
async function startReplicaMap(mongoClient) {
  const cl = mongoClient.db('tms_admin').collection('replica_map')
  const replicas = await cl.find().toArray()
  replicas.forEach((replica) => {
    let strId = replica._id.toHexString()
    if (!ChangeStreamByReplicaId.has(strId)) {
      newReplicaWatcher(mongoClient, replica.primary, replica.secondary).then(
        (watcher) => {
          ChangeStreamByReplicaId.set(strId, watcher)
        }
      )
    }
  })
  return true
}

function startup() {
  getMongoClient().then((mongoClient) => {
    watchReplicaMap(mongoClient).then(() => {
      startReplicaMap(mongoClient)
    })
  })
}

function cleanWatchers() {
  if (ReplicaMapWatcher) {
    ReplicaMapWatcher.close()
    ReplicaMapWatcher = null
  }
  if (ChangeStreamByReplicaId.size) {
    ChangeStreamByReplicaId.forEach((watcher) => watcher.close())
    ChangeStreamByReplicaId.clear()
  }
}

// 捕获ctrl+c
process.on('SIGINT', () => {
  cleanWatchers()
  setTimeout(() => {
    process.exit()
  })
})
// 退出
process.on('exit', () => {
  cleanWatchers()
  logger.info('退出集合复制监听')
})

startup()
