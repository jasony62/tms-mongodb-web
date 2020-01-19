import { TmsAxios } from 'tms-vue'

export default {
  /**
   * 获取验证码
   *
   * @returns
   */
  getCaptcha() {
    return TmsAxios.ins()
      .get('/mgdb/ue/auth/captcha?width=150&height=44')
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
      .post('/mgdb/ue/auth/token', userArg)
      .then(rst => rst.data)
      .catch(err => Promise.reject(err))
  }
}
