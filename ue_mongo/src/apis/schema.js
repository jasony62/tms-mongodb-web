import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/schema'

export default {
  listSimple() {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/listSimple`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  list(type) {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list?scope=${type}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  }
}
