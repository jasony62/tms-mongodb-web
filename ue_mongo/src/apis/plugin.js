import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/plugin'

export default {
  getPlugins() {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/pluginDocument`)
      .then(rst => rst.data.result)
  },
  handlePlugin() {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/commonExecute`, arguments[0], { params: arguments[1] })
      .then(rst => rst.data.result)
  }
}
