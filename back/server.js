const log4jsConfig = require('./config/log4js')
const log4js = require('log4js')
log4js.configure(log4jsConfig)

const { Context } = require('./context')
Context.init()

const { TmsKoa } = require('tms-koa')

const tmsKoa = new TmsKoa()

// 下载
let router = require('./download/router')
let beforeController = router.routes()
tmsKoa.startup({ beforeController: [ beforeController ] })
