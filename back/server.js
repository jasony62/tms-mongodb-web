const log4jsConfig = require('./config/log4js')
const log4js = require('log4js')
log4js.configure(log4jsConfig)

const { Context } = require('./context')
Context.init()

const { TmsKoa } = require('tms-koa')

const tmsKoa = new TmsKoa()
// webApi
let router2 = require('./api/router')
let apiController = router2.routes()
// plugins
let router3 = require('./plugins/router')
let plugController = router3.routes()

tmsKoa.startup({ beforeController: [ apiController, plugController ] })
