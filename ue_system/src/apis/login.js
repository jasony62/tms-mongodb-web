import { TmsAxios } from 'tms-vue'

const baseAuth = (process.env.VUE_APP_BACK_AUTH_BASE || '') + '/auth'

export default {
  /**
   * 获取验证码
   *
   * @returns
   */
  fnGetCaptcha() {
    return TmsAxios.ins('auth-api')
      .get(`${baseAuth}/captcha?width=150&height=44`)
      .then(rst => rst.data)
  },
  /**
   * 获取token
   *
   * @returns
   */
  fnGetToken(userArg) {
    return TmsAxios.ins('auth-api')
      .post(`${baseAuth}/authorize`, userArg)
      .then(rst => rst.data)
  }
}
