import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/admin/tag'

export default {
  list(bucket) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then(rst => rst.data.result)
  },
  create(bucket, proto) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then(rst => rst.data.result)
  },
  update(bucket, tag) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update?id=${tag._id}`, tag, { params })
      .then(rst => rst.data.result)
  },
  remove(bucket, tag) {
    const params = { bucket, name: tag.name }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then(rst => rst.data.result)
  }
}
