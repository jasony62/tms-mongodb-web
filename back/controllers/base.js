const {
  Ctrl,
  ResultFault,
  ResultObjectNotFound,
  ResultData
} = require('tms-koa')
const {
  PluginConfig
} = require('../models/mgdb')
const fs = require('fs')
const path = require('path')
const log4js = require('log4js')
const logger = log4js.getLogger('tms-mongodb-web')

function allowAccessBucket(bucket, clientId) {
  if (bucket.creator === clientId) return true

  const {
    coworkers
  } = bucket

  if (!Array.isArray(coworkers)) return false

  return coworkers.some((c) => c.id === clientId)
}

class Base extends Ctrl {
  constructor(...args) {
    super(...args)
  }
  async tmsBeforeEach() {
    /* 多租户模式下，检查bucket访问权限 */
    if (/yes|true/i.test(process.env.TMW_REQUIRE_BUCKET)) {
      const bucketName = this.request.query.bucket
      if (!bucketName) {
        return new ResultFault('没有提供bucket参数')
      }
      // 检查bucket是否存在
      const client = this.mongoClient
      const clBucket = client.db('tms_admin').collection('bucket')
      const bucket = await clBucket.findOne({
        name: bucketName
      })
      if (!bucket) {
        return new ResultObjectNotFound('指定的bucket不存在')
      }
      // 检查当前用户是否对bucket有权限
      if (!allowAccessBucket(bucket, this.client.id)) {
        // 检查是否做过授权
        return new ResultObjectNotFound('没有访问指定bucket的权限')
      }
      this.bucket = bucket
    }

    return true
  }

  /**
   * 获取插件db配置
   */
  async db() {
    const {
      db
    } = PluginConfig.ins()

    return new ResultData(db)
  }

  /**
   * 获取插件collection配置
   */
  async collection() {
    const {
      collection
    } = PluginConfig.ins()

    return new ResultData(collection)
  }

  /**
   * 获取插件document配置
   */
  async document() {
    const {
      document
    } = PluginConfig.ins()

    return new ResultData(document)
  }


  /**
   * @name 插件实现机制
   * @param type db collection document
   */
  async commonExecute() {
    logger.debug('request数据：', this.request.query)
    const {
      pluginUrl
    } = this.request.query

    if (typeof pluginUrl !== 'string' || !pluginUrl.length) return Promise.resolve(new ResultFault('pluginUrl参数错误'))

    const pluginConfig = PluginConfig.ins()
    let type
    let pluginUrlArr = pluginUrl.split(',')

    const arr = Object.keys(pluginConfig)
    for (let i = 0; i < arr.length; i++) {
      const key = arr[i]
      if (!pluginConfig[key].length) continue
      const currentRes = pluginConfig[key].map(ele => ele[0])
      type = currentRes.includes(pluginUrlArr[0]) ? key : null
    }

    logger.info('type：', type)
    if (!type) return Promise.resolve(new ResultFault('pluginUrl参数错误'))

    return new Promise(async resolve => {

      let filename, plugin, args, res, pluginCfg


      const pluginConfigs = pluginConfig[type]

      for (let i = 0; i < pluginConfigs.length; i++) {
        pluginCfg = pluginConfigs[i]
        if (Array.isArray(pluginCfg) && pluginCfg.length > 0) {
          [filename, ...args] = pluginCfg
        } else if (typeof pluginCfg === 'string') {
          filename = pluginCfg
        } else {
          continue
        }

        if (!pluginUrlArr.includes(filename)) continue
        if (!fs.existsSync(path.resolve(`${filename}.js`))) continue
        plugin = require(path.resolve(filename))

        if (typeof plugin === 'function') {
          const currentObj = new plugin(this)

          const funName = plugin.name.toLowerCase()
          res = await currentObj[funName](this.request.query, this.request.body, ...args)
        }
      }

      return resolve(new ResultData(res))
    })
  }
}

module.exports = Base