import { TmsAxios } from 'tms-vue3'
import { aesEncrypt } from '../encryption'
const baseAuth = (import.meta.env.VITE_BACK_AUTH_BASE || '') + '/auth'
const userKey = import.meta.env.VITE_APP_LOGIN_KEY_USERNAME || 'uname'
const pwdKey = import.meta.env.VITE_APP_LOGIN_KEY_PASSWORD || 'password'

export default {
  /**
   * 注册
   *
   * @returns
   */
   fnRegister(userArg: any) {
    let userId
    if (sessionStorage.getItem('captcha_code')) {
      userId = sessionStorage.getItem('captcha_code')
    }
    const appId = import.meta.env.VITE_APP_LOGIN_CODE_APPID || 'tms-web'
    let params = { ...userArg }
    let url = `${baseAuth}/register`
    if (import.meta.env.VITE_APP_AUTH_SECRET === 'yes') {
      const time = Date.now()
      url += '?adc=' + time
      params[userKey] = aesEncrypt(params[userKey], time)
      params[pwdKey] = aesEncrypt(params[pwdKey], time)
    }
    const data = {
      password: params['password'],
      code: params['pin'],
      username: params['uname'],
      captchaid: userId,
      appid: appId
    }
    return TmsAxios.ins('auth-api')
      .post(url, data)
      .then((rst: any) => { return Promise.resolve(rst.data) })
  },
}
