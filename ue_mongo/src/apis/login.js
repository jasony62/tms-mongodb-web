import { TmsAxios } from 'tms-vue'

const baseAuth = (process.env.VUE_APP_BACK_AUTH_BASE || '') + '/auth'

export default {
  fnGetCaptcha() {
    return TmsAxios.ins('auth-api')
      .get(`${baseAuth}/captcha?width=150&height=44`)
      .then(rst => rst.data)
  },
  fnGetJwt(userArg) {
    return TmsAxios.ins('auth-api')
      .post(`${baseAuth}/authorize`, userArg)
      .then(rst => rst.data)
  }
}
