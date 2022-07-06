import * as log4js from 'log4js'
import * as path from 'path'
import * as fs from 'fs'
let cnfpath = path.resolve(process.cwd()+'/config/log4js.js')
if (fs.existsSync(cnfpath)) {
  const log4jsConfig = require(process.cwd()+'/config/log4js')
  log4js.configure(log4jsConfig)
}
const logger = log4js.getLogger('tms-mongodb-web')

import { TmsKoa } from 'tms-koa'
const tmsKoa = new TmsKoa()

let Replica_Child_Process // 执行集合复制的子进程
/**
 * 框架完成初始化
 */
function afterInit() {
  logger.info('已完成框架初始化')
  /**
   * 启动集合实时复制
   */
  if (/yes|true/i.test(process.env.TMW_REALTIME_REPLICA)) {
    logger.info('启动集合实时复制线程')
    const cp = require('child_process')
    Replica_Child_Process = cp.spawn('node', ['./replica/watch.js'], {
      detached: true,
      stdio: 'ignore',
    })
    Replica_Child_Process.unref()
  }
}

// 捕获ctrl+c
process.on('SIGINT', () => {
  process.exit()
})
// 退出
process.on('exit', () => {
  if (Replica_Child_Process) {
    Replica_Child_Process.kill('SIGINT')
  }
  logger.info('退出')
})

tmsKoa.startup({ afterInit })
