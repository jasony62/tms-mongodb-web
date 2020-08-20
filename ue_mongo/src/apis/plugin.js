import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/plugin'

export default {
  getPlugins() {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/pluginDocument`)
      .then(rst => rst.data.result)
  },
  handlePlugin(param, bucket, pluginCfg, db, clName, ) {
    const params = { bucket, pluginCfg, db, clName }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/commonExecute`, param, { params })
      .then(rst => rst.data.result)
  }
}
