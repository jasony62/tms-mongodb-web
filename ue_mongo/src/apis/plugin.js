import { TmsAxios } from 'tms-vue'

const base = '/mgdb/api'

export default {
  list() {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/pluginInfo/getPlugins`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  }
}
