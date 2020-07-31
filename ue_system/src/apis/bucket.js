import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/admin/bucket'

export default {
  list() {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`)
      .then(rst => rst.data.result)
  },
  create(proto) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto)
      .then(rst => rst.data.result)
  },
  update(bucketName, updated) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update?bucket=${bucketName}`, updated)
      .then(rst => rst.data.result)
  },
  remove(bucket) {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove?bucket=${bucket.name}`)
      .then(rst => rst.data.result)
  }
}
