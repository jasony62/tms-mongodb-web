const log4js = require('log4js')
const logger = log4js.getLogger('etd-api')
const Router = require('tms-koa/node_modules/koa-router')
const _ = require('lodash')

const fs = require('fs')
const { ResultFault, AccessTokenFault } = require('tms-koa')

/**
 * 根据请求路径找到匹配的控制器和方法
 *
 * 最后1段作为方法
 * 倒数第2端为文件名（加.js）
 * 如果文件不存在，倒数第2段作为目录名，查找main.js文件
 *
 * @param {Request} req
 * @param {Client} client 客户端
 * @param {DbContext} dbContext 数据库实例
 *
 */
function findCtrlAndMethod(ctx, client, dbContext) {
  let { path } = ctx.request

  if (prefix) path = path.replace(prefix, '')

  let pieces = path.split('/')
  if (pieces.length < 2) {
    logger.error('参数错误，请求的对象不存在(1)')
    throw new Error('参数错误，请求的对象不存在(1)')
  }

  let method = pieces.splice(-1, 1)[0]
  let ctrlPath = process.cwd() + '/api/' + pieces.join('/') + '.js'
  if (!fs.existsSync(ctrlPath)) {
    ctrlPath = process.cwd() + '/api/' + pieces.join('/') + '/main.js'
    if (!fs.existsSync(ctrlPath)) {
      logger.error('参数错误，请求的对象不存在(2)')
      throw new Error('参数错误，请求的对象不存在(2)')
    }
  }

  const CtrlClass = require(ctrlPath)
  const oCtrl = new CtrlClass(ctx, client, dbContext)
  if (oCtrl[method] === undefined && typeof oCtrl[method] !== 'function') {
    logger.error('参数错误，请求的对象不存在(3)')
    throw new Error('参数错误，请求的对象不存在(3)')
  }

  return [oCtrl, method]
}
/**
 * 根据请求找到对应的控制器并执行
 *
 * @param {Context} ctx
 *
 */
async function fnCtrlWrapper(ctx) {
  let { request, response } = ctx
  let tmsClient = ''

  let { DbContext } = require('tms-db')
  let dbContext
  try {
    /**
     * 获取数据库连接
     */
    dbContext = new DbContext()

    /**
     * 找到对应的控制器
     */
    let [oCtrl, method] = findCtrlAndMethod(ctx, tmsClient, dbContext)

    const result = await oCtrl[method](request)

    response.body = result
  } catch (err) {
    logger.error('控制器执行异常', err)
    let errMsg = typeof err === 'string' ? err : err.toString()
    response.body = new ResultFault(errMsg)
  } finally {
    // 关闭数据库连接
    if (dbContext) dbContext.end()
    dbContext = null
  }
}

const appConfig = require(process.cwd() + '/config/app')
let prefix = _.get(appConfig, ['router', 'api', 'prefix'], '')
const router = new Router({ prefix })
router.all('/*', fnCtrlWrapper)

module.exports = router
