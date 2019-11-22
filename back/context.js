const fs = require('fs')
const path = require('path')
const log4js = require('log4js')
const logger = log4js.getLogger('tms-mongodb-web')
const MongoClient = require('mongodb').MongoClient

class MongoConfig {}
MongoConfig.connect = function(host, port) {
  return MongoClient.connect(`mongodb://${host}:${port}`, {
    useUnifiedTopology: true
  })
}
MongoConfig.ins = (function() {
  let instance
  return async function() {
    if (instance) return instance
    const filename = path.resolve('config/mongodb.js')
    if (!fs.existsSync(filename)) {
      const msg = `配置文件${filename}不存在`
      logger.error(msg)
      return new MongoError(msg)
    }

    const { host, port } = require(filename)

    if (typeof host !== 'string') {
      let msg = '没有指定mongodb的主机地址'
      logger.error(msg)
      throw new MongoError(msg)
    }
    if (typeof port !== 'number') {
      let msg = '没有指定mongodb连接的端口'
      logger.error(msg)
      throw new MongoError(msg)
    }

    const client = await MongoConfig.connect(host, port)

    logger.info(`加载配置文件'${filename}'成功`)

    return (instance = Object.assign(new MongoConfig(), {
      host,
      port,
      client
    }))
  }
})()

class Context {
  constructor(mongoClient) {
    this.mongoClient = mongoClient
  }
}
Context.ins = (function() {
  let instance
  return async function() {
    if (instance) return Promise.resolve(instance)

    const { client } = await MongoConfig.ins()

    instance = new Context(client)

    return Promise.resolve(instance)
  }
})()
Context.init = Context.ins
Context.mongoClient = async function() {
  const ins = await Context.ins()
  return ins.mongoClient
}

module.exports = { Context }
