type Globalsettings = {
  authApiBase: string
  authApiPort: number
  backApiBase: string
  backApiPort: number
  loginCaptchaDisabled: boolean
  externalFsUrl: string
  compact: boolean
}

let _globalsettings: Globalsettings = {
  authApiBase: import.meta.env.VITE_AUTH_API_BASE || 'auth',
  authApiPort: parseInt(import.meta.env.VITE_AUTH_API_PORT ?? location.port),
  backApiBase: import.meta.env.VITE_BACK_API_BASE || 'api',
  backApiPort: parseInt(import.meta.env.VITE_BACK_API_PORT ?? location.port),
  loginCaptchaDisabled: /yes|true/i.test(
    import.meta.env.VITE_LOGIN_CAPTCHA_DISABLED
  ),
  externalFsUrl: import.meta.env.VITE_EXTERNAL_FS_URL,
  compact: false,
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
  if (settings.loginCaptchaDisabled)
    _globalsettings.loginCaptchaDisabled = settings.loginCaptchaDisabled
  if (settings.externalFsUrl)
    _globalsettings.externalFsUrl = settings.externalFsUrl
  if (settings.compact === true) _globalsettings.compact = true
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
 * 外部文件服务地址
 */
export const EXTERNAL_FS_URL = () => _globalsettings.externalFsUrl

/**
 * 精简模式
 */
export const COMPACT_MODE = () => _globalsettings.compact

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
