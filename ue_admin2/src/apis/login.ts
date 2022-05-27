import { TmsAxios } from 'tms-vue3'

import { encodeAccountV1 } from "tms-koa-account/models/crypto"
const baseAuth = (import.meta.env.VITE_BACK_AUTH_BASE || '') + '/auth'

export default {
  /**
   * 获取验证码
   *
   * @returns
   */
   fnCaptcha() {
    const userId: string = String(new Date().getTime())
    sessionStorage.setItem('captcha_code', userId)
    return TmsAxios.ins('auth-api')
      .get(`${baseAuth}/captcha?captchaid=${userId}&appid=${import.meta.env.VITE_APP_LOGIN_CODE_APPID || 'tms-web'}&background=fff`)
      .then((rst: any) => {
        const data = {
          code: rst.data.code,
          captcha: rst.data.result,
        }
        return Promise.resolve(data)
      })
  },
  /**
   * 获取token
   *
   * @returns
   */
   fnLogin(userArg: any) {
    let userId
    if (sessionStorage.getItem('captcha_code')) {
      userId = sessionStorage.getItem('captcha_code')
    }
    const appId = import.meta.env.VITE_APP_LOGIN_CODE_APPID || 'tms-web'
    let params = { ...userArg }
    let url = `${baseAuth}/authenticate`
    if (import.meta.env.VITE_APP_AUTH_SECRET === 'yes') {
      const encode = encodeAccountV1({username:params['uname'], password:params['password']})
      params['uname'] = encode[1]['username']
      params['password'] =  encode[1]['password']
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
