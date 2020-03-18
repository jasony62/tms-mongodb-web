import { TmsAxios } from 'tms-vue'

const baseAuth = (process.env.VUE_APP_BACK_AUTH_BASE_REWRITE || '') + '/auth'

export default {
  /**
   * 获取验证码
   *
   * @returns
   */
  getCaptcha() {
    return TmsAxios.ins()
      .get(`${baseAuth}/captcha?width=150&height=44`)
      .then(rst => rst.data)
      .catch(err => Promise.reject(err))
  },
  /**
   * 获取token
   *
   * @returns
   */
  getToken(userArg) {
    return TmsAxios.ins()
      .post(`${baseAuth}/authorize`, userArg)
      .then(rst => rst.data)
      .catch(err => Promise.reject(err))
  }
}
