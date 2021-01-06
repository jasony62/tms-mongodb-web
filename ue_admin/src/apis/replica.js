import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/admin/replica'

export default {
  list(bucket, { keyword, page, size } = {}, proto) {
    const params = { bucket, keyword, page, size }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/list`, proto, { params })
      .then(rst => rst.data.result)
  },
  create(bucket, proto) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then(rst => rst.data.result)
  },
  remove(bucket, proto) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/remove`, proto, { params })
      .then(rst => rst.data.result)
  },
  synchronize(bucket, proto) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/synchronize`, proto, { params })
      .then(rst => rst.data.result)
  }
}
