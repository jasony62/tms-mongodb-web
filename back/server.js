const log4jsConfig = require('./config/log4js')
const log4js = require('log4js')
log4js.configure(log4jsConfig)

const { TmsKoa } = require('tms-koa')
const tmsKoa = new TmsKoa()

// plugins
let router3 = require('./plugins/router')
let plugController = router3.routes()

tmsKoa.startup({ beforeController: [plugController] })
