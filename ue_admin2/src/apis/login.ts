import { TmsAxios } from 'tms-vue3'

import { aesEncrypt } from '../encryption'
const baseAuth = (import.meta.env.VITE_BACK_AUTH_BASE || '') + '/auth'
//const userKey = import.meta.env.VITE_APP_LOGIN_KEY_USERNAME || 'uname'
//const pwdKey = import.meta.env.VITE_APP_LOGIN_KEY_PASSWORD || 'password'

const APPID = import.meta.env.VITE_LOGIN_CODE_APPID || 'tms-mongodb-web'

let captchaId: string

function genCaptchaId() {
  let rand = Math.floor(Math.random() * 1000 + 1)
  let id = Date.now() * 1000 + rand
  return `${id}`
}

export default {
  /**
   * 获取验证码
   */
  fnCaptcha() {
    captchaId = genCaptchaId()
    const url = `${baseAuth}/captcha?appid=${APPID}&captchaid=${captchaId}&background=fff`
    return TmsAxios.ins('auth-api')
      .get(url)
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
   */
  fnLogin(userArg: any) {
    let params = { ...userArg }
    let url = `${baseAuth}/authenticate`
    if (import.meta.env.VITEP_ENCRYPT_SECRET === 'yes') {
      //TODO 加密方法不能写死
      const time = Date.now()
      url += '?adc=' + time
      params['uname'] = aesEncrypt(params['uname'], time)
      params['password'] = aesEncrypt(params['password'], time)
    }
    const data = {
      password: params['password'],
      code: params['pin'],
      username: params['uname'],
      captchaid: captchaId,
      appid: APPID,
    }
    return TmsAxios.ins('auth-api')
      .post(url, data)
      .then((rst: any) => {
        return Promise.resolve(rst.data)
      })
  },
}
