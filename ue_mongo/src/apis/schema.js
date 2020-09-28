import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/schema'

export default {
  list(bucket, type) {
    const params = { bucket, scope: type }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then(rst => rst.data.result)
  },
  listByTag(bucket, tagName) {
    const params = { bucket, tag: tagName }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/listByTag`, { params })
      .then(rst => rst.data.result)
  }
}
