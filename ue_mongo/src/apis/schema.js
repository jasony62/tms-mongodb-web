import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/schema'

export default {
  list(bucketName, type) {
    const params = { scope: type }
    if (bucketName) params.bucket = bucketName
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then(rst => rst.data.result)
  }
}
