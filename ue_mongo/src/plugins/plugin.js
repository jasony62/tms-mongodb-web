import { TmsAxios } from 'tms-vue'

const base = process.env.VUE_APP_BACK_API_BASE || ''

export default {
  list() {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/pluginInfo/getPlugins`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  }
}
