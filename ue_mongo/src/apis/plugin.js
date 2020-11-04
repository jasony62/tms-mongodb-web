import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/plugins/index'

export default {
  getPlugins() {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/pluginDocument`)
      .then(rst => rst.data.result)
  },
  handlePlugin(...args) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/commonExecute`, args[0], { params: args[1] })
      .then(rst => rst.data.result)
  }
}
