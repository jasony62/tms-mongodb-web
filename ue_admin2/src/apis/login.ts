import { TmsAxios } from 'tms-vue3'

const baseAuth = (import.meta.env.VITE_BACK_API_BASE || '') + '/auth'

export default {
  /**
   * 获取验证码
   *
   * @returns
   */
  fnGetCaptcha() {
    return TmsAxios.ins('auth-api')
      .get(`${baseAuth}/captcha?width=150&height=44`)
      .then((rst) => rst.data)
  },
  /**
   * 获取token
   *
   * @returns
   */
  fnGetToken(userArg) {
    return TmsAxios.ins('auth-api')
      .post(`${baseAuth}/authorize`, userArg)
      .then((rst) => rst.data)
  },
}
