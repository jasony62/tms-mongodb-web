import { TmsAxios } from 'tms-vue3'
const baseAuth = (import.meta.env.VITE_BACK_AUTH_BASE || '') + '/auth'
import { encodeAccountV1 } from "tms-koa-account/models/crypto"
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
      // const time = Date.now()
      // url += '?adc=' + time
      const encode = encodeAccountV1({username: params['uname'], password: params['password']})
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
