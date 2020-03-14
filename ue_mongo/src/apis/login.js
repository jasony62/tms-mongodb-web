import { TmsAxios } from 'tms-vue'

const baseAuth = (process.env.VUE_APP_BACK_AUTH_BASE || '') + '/auth'

export default {
  getCaptcha() {
    return TmsAxios.ins()
      .get(`${baseAuth}/captcha?width=150&height=44`)
      .then(rst => rst.data)
      .catch(err => Promise.reject(err))
  },
  getToken(userArg) {
    return TmsAxios.ins()
      .post(`${baseAuth}/token`, userArg)
      .then(rst => rst.data)
      .catch(err => Promise.reject(err))
  }
}
