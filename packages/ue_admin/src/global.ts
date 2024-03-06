//@ts-ignore
import { io } from 'socket.io-client'

type Globalsettings = {
  authApiBase: string
  authApiPort: number
  backApiBase: string
  backApiPort: number
  backPushPort: number
  loginCaptchaDisabled: boolean
  loginUsernameJsonPointer: string // 从用户信息中获取用户名称的路径
  externalLoginUrl: string // 第三方登录
  externalFsUrl: string
  templateVarsApiUrl: string
  tmwAppTags: string // 标签字段名称
  compact: boolean // 精简模式，在iframe打开时使用
  extract: boolean // 提取数据模式，在iframe打开时使用
  multiple: boolean // 提取数据模式下，是否支持多选
  manual?: any // 在线用户手册
  labels?: { [k: string]: string } // 标题定义
  pagination?: { [k: string]: { [k: string]: number } } // 分页参数
}

let _globalsettings: Globalsettings = {
  authApiBase: import.meta.env.VITE_AUTH_API_BASE || 'auth',
  authApiPort: parseInt(import.meta.env.VITE_AUTH_API_PORT ?? location.port),
  backApiBase: import.meta.env.VITE_BACK_API_BASE || 'api',
  backApiPort: parseInt(import.meta.env.VITE_BACK_API_PORT ?? location.port),
  backPushPort: parseInt(import.meta.env.VITE_BACK_PUSH_PORT ?? -1),
  loginCaptchaDisabled: /yes|true/i.test(
    import.meta.env.VITE_LOGIN_CAPTCHA_DISABLED
  ),
  loginUsernameJsonPointer:
    import.meta.env.VITE_LOGIN_USERNAME_JSONPOINTER || '/data/username',
  externalLoginUrl: import.meta.env.VITE_EXTERNAL_LOGIN_URL,
  externalFsUrl: import.meta.env.VITE_EXTERNAL_FS_URL,
  templateVarsApiUrl: import.meta.env.VITE_TEMPLATE_VARS_API_URL,
  tmwAppTags: import.meta.env.VITE_TMW_APP_TAGS || 'TMW_TAGS',
  compact: false,
  extract: false,
  multiple: true,
}
/**
 * 根据在线获取的全局设置
 * @param settings
 */
export function init(settings: Globalsettings) {
  if (settings.authApiBase) _globalsettings.authApiBase = settings.authApiBase
  if (settings.authApiPort) _globalsettings.authApiPort = settings.authApiPort
  if (settings.backApiBase) _globalsettings.backApiBase = settings.backApiBase
  if (settings.backApiPort) _globalsettings.backApiPort = settings.backApiPort
  if (settings.backPushPort)
    _globalsettings.backPushPort = settings.backPushPort
  if (settings.loginCaptchaDisabled)
    _globalsettings.loginCaptchaDisabled = settings.loginCaptchaDisabled
  if (settings.loginUsernameJsonPointer)
    _globalsettings.loginUsernameJsonPointer = settings.loginUsernameJsonPointer
  if (settings.externalLoginUrl)
    _globalsettings.externalLoginUrl = settings.externalLoginUrl
  if (settings.externalFsUrl)
    _globalsettings.externalFsUrl = settings.externalFsUrl
  if (settings.templateVarsApiUrl)
    _globalsettings.templateVarsApiUrl = settings.templateVarsApiUrl
  if (settings.tmwAppTags) _globalsettings.tmwAppTags = settings.tmwAppTags
  if (settings.compact === true) _globalsettings.compact = true
  if (settings.extract === true) _globalsettings.extract = true
  if (settings.multiple === false) _globalsettings.multiple = false
  if (settings.manual && typeof settings.manual === 'object')
    _globalsettings.manual = settings.manual
  if (settings.labels && typeof settings.labels === 'object')
    _globalsettings.labels = settings.labels
  if (settings.pagination && typeof settings.pagination === 'object') {
    _globalsettings.pagination = settings.pagination
  }
}
/**
 * 根据环境变量设置认证服务起始地址
 */
let _AUTH_API_URL: string
export const AUTH_API_URL = () => {
  if (_AUTH_API_URL) return _AUTH_API_URL

  let base = _globalsettings.authApiBase
  if (/^http/.test(base)) {
    _AUTH_API_URL = base
  } else {
    let url
    let { protocol, hostname } = location
    url = `${protocol}//${hostname}`

    let port = _globalsettings.authApiPort
    if (port && port !== 80 && port !== 443) url += `:${port}`

    if (base) url += '/' + base.replace(/^\/*/, '')

    _AUTH_API_URL = url
  }

  return _AUTH_API_URL
}

/**
 * 根据环境变量设置后端服务起始地址
 */
let _BACK_API_URL: string
export const BACK_API_URL = () => {
  if (_BACK_API_URL) return _BACK_API_URL

  let base = _globalsettings.backApiBase
  if (/^http/.test(base)) {
    _BACK_API_URL = base
  } else {
    let url
    let { protocol, hostname } = location
    url = `${protocol}//${hostname}`

    let port = _globalsettings.backApiPort
    if (port && port !== 80 && port !== 443) url += `:${port}`

    if (base) url += '/' + base.replace(/^\/*/, '')

    _BACK_API_URL = url
  }

  return _BACK_API_URL
}

/**
 * 根据环境变量设置后端推送服务起始地址
 */
let _BACK_PUSH_URL: string
export const BACK_PUSH_URL = () => {
  if (_BACK_PUSH_URL) return _BACK_PUSH_URL

  if (_globalsettings.backPushPort > 0) {
    let url
    let { protocol, hostname } = location
    url = `${protocol}//${hostname}`

    let port = _globalsettings.backPushPort
    if (port && port !== 80 && port !== 443) url += `:${port}`
    _BACK_PUSH_URL = url
  } else {
    _BACK_PUSH_URL = ''
  }

  return _BACK_PUSH_URL
}
/**
 * 消息推送服务的socket连接
 */
let _PushSocket: any
export const PushSocket = async () => {
  if (_PushSocket) return _PushSocket
  let url = BACK_PUSH_URL()
  if (url) {
    let socket = io(url)
    return new Promise((resolve) => {
      socket.on('tms-koa-push', async (data: any) => {
        _PushSocket = socket
        resolve(_PushSocket)
      })
    })
  }
  return null
}
/**
 * 文件下载起始地址
 * @returns
 */
export const FS_BASE_URL = () => {
  let url
  let { protocol, hostname } = location
  url = `${protocol}//${hostname}`
  let port = _globalsettings.backApiPort
  if (port && port !== 80 && port !== 443) url += `:${port}`

  return url
}
/**
 * 关闭验证码
 */
export const LOGIN_CAPTCHA_DISABLED = () => _globalsettings.loginCaptchaDisabled
/**
 * 获取登录用户名称的路径
 */
export const LOGIN_USERNAME_JSONPOINTER = () =>
  _globalsettings.loginUsernameJsonPointer
/**
 * 外部登录地址
 */
export const EXTERNAL_LOGIN_URL = () => _globalsettings.externalLoginUrl
/**
 * 外部文件服务地址
 */
export const EXTERNAL_FS_URL = () => _globalsettings.externalFsUrl
/**
 * 标签数据字段名
 * @returns
 */
export const TMW_APP_TAGS = () => _globalsettings.tmwAppTags
/**
 * 精简模式
 */
export const COMPACT_MODE = () => _globalsettings.compact
/**
 * 提取数据模式
 */
export const EXTRACT_MODE = () => _globalsettings.extract
/**
 * 提取数据模式，是否多选
 */
export const MULTIPLE_MODE = () => _globalsettings.multiple
/**
 * 获取模板变量地址
 */
export const TEMPLATE_VARS_API_URL = () => _globalsettings.templateVarsApiUrl

// 默认的文档对象说明模板
const DocManualTpl = `<div class="p-4 flex flex-col gap-2"> <div>ID: {{ doc._id }}</div><div>TAGS: {{doc.${TMW_APP_TAGS()}}}</div> </div>`

/**
 * 文档对象在线用户手册
 */
export const DOC_MANUAL = (dbName: string, clName: string) => {
  let tpl
  const { manual } = _globalsettings
  if (
    manual?.document &&
    Array.isArray(manual.document) &&
    manual.document.length
  ) {
    let matched = manual.document.find((rule: any) => {
      let { db, cl } = rule
      return (
        db && new RegExp(db).test(dbName) && cl && new RegExp(cl).test(clName)
      )
    })
    if (matched) tpl = matched.template
  }

  return tpl ? tpl : DocManualTpl
}
/**
 * 标题
 */
export const LABEL = (key: string, defaultValue?: string) => {
  const { labels } = _globalsettings
  if (labels && typeof labels === 'object') {
    let val = labels[key]
    return val
  }
  return defaultValue
}

const way = import.meta.env.VITE_STORETOKEN_WAY

function getCookie(cname: string) {
  let name = cname + '='
  let ca = document.cookie.split(';')
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim()
    if (c.indexOf(name) == 0) return c.substring(name.length, c.length)
  }
  return ''
}
/**
 *
 */
export function setLocalToken(token: string) {
  if (way === 'session') {
    sessionStorage.setItem('access_token', token)
  } else {
    let host = window.location.hostname
    document.cookie = `access_token=${token};path=/;domain=${host}`
  }
}
/**
 * 返回保存在本地的token信息
 * @returns
 */
export function getLocalToken(): string | null {
  if (way === 'session') {
    return sessionStorage.getItem('access_token')
  } else {
    return getCookie('access_token')
  }
}
/**
 *
 */
export function removeLocalToken() {
  if (way === 'session') {
    sessionStorage.removeItem('access_token')
  }
}

export function parseLocation(url: string): any | null {
  if (!url) return null
  let aEl = window.document.createElement('a')
  aEl.href = url
  return {
    href: aEl.href,
    origin: aEl.origin || aEl.protocol + '//' + aEl.host,
    protocol: aEl.protocol,
    host: aEl.host,
    hostname: aEl.hostname,
    port: aEl.port,
    pathname: aEl.pathname,
    search: aEl.search,
    hash: aEl.hash,
  }
}

export const PAGINATION_DB_SIZE = () =>
  _globalsettings.pagination?.database?.size || 100

export const PAGINATION_COL_SIZE = () =>
  _globalsettings.pagination?.collection?.size || 100

export const PAGINATION_DOC_SIZE = () =>
  _globalsettings.pagination?.document?.size || 100
