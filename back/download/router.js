const log4js = require('@log4js-node/log4js-api')
const logger = log4js.getLogger('tms-koa-downLoad')
const Router = require('tms-koa/node_modules/koa-router')
const _ = require('lodash')
const send = require('koa-send')
const fsConfig = require(process.cwd() + '/config/fs')
const fs = require('fs')
const { ResultFault, AccessTokenFault } = require('tms-koa')
const Token = require('tms-koa/lib/auth/token')

/**
 * 根据请求找到对应的控制器并执行
 *
 * @param {Context} ctx
 *
 */
async function fnCtrlWrapper(ctx) {
  let { request, response } = ctx
  let tmsClient
  if (Token.supported()) {
    const { access_token } = request.query
    if (!access_token) {
      response.body = new ResultFault('缺少access_token参数')
      return
    }

    let aResult = await Token.fetch(access_token)
    if (false === aResult[0]) {
      response.body = new AccessTokenFault(aResult[1])
      return
    }
    tmsClient = aResult[1]
  }

  try {
    let { path:fileUrl } = request
    fileUrl = fileUrl.replace(prefix, '')
    
    let rootPath = _.get(fsConfig, ['local', 'outPath'], '')
    if (!rootPath) rootPath = "public"
    let filePath = rootPath + fileUrl
    if (!fs.existsSync(filePath)) response.body = new ResultFault("文件不存在")

    ctx.attachment(filePath)
    return send(ctx, filePath)
  } catch (err) {
    logger.error('控制器执行异常', err)
    let errMsg = typeof err === 'string' ? err : err.toString()
    response.body = new ResultFault(errMsg)
  }
}

const appConfig = require(process.cwd() + '/config/app')
let prefix = _.get(appConfig, ['router', 'download', 'prefix'], '')
const router = new Router({ prefix })
router.all('/*', fnCtrlWrapper)

module.exports = router
