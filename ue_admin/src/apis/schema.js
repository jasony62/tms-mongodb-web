import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/admin/schema'

export default {
  list(bucket, scope) {
    const type = typeof scope === 'object' ? scope.join(',') : scope
    const params = { scope: type }
    if (bucket) params.bucket = bucket
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then(rst => rst.data.result)
  },
  listSimple() {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/listSimple`)
      .then(rst => rst.data.result)
  },
  create(bucket, proto) {
    const params = {}
    if (bucket) params.bucket = bucket
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then(rst => rst.data.result)
  },
  update(bucket, schema, updated) {
    const params = {}
    if (bucket) params.bucket = bucket
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update?id=${schema._id}`, updated, { params })
      .then(rst => rst.data.result)
  },
  remove(bucket, schema) {
    const params = { id: schema._id }
    if (bucket) params.bucket = bucket
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then(rst => rst.data.result)
  }
}
