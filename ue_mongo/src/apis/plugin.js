import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/document'

export default {
  getPlugins() {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/document`)
      .then(rst => rst.data.result)
  },
  handlePlugin(bucket, pluginUrl, filter) {
    const params = { bucket, pluginUrl }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/commonExecute`, { filter }, { params })
      .then(rst => rst.data.result)
  }
}
