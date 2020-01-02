import { TmsAxios } from 'tms-vue'

const base = '/mgdb/api/mongo/schema'

export default {
  listSimple() {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/listSimple`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  }
}
