import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/admin/db'

export default {
  list(bucket) {
    const params = {}
    if (bucket) params.bucket = bucket
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then(rst => rst.data.result)
  },
  create(bucket, proto) {
    const params = {}
    if (bucket) params.bucket = bucket
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then(rst => rst.data.result)
  },
  update(bucket, dbName, updated) {
    const params = { db: dbName }
    if (bucket) params.bucket = bucket
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update`, updated, { params })
      .then(rst => rst.data.result)
  },
  remove(bucket, db) {
    const params = { db: db.name }
    if (bucket) params.bucket = bucket
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then(rst => rst.data.result)
  }
}
