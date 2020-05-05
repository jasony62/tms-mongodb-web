import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/db'

export default {
  list(bucket) {
    const params = {}
    if (bucket) params.bucket = bucket
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  create(bucket, proto) {
    const params = {}
    if (bucket) params.bucket = bucket
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  update(bucket, dbName, updated) {
    const params = { db: dbName }
    if (bucket) params.bucket = bucket
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update`, updated, { params })
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  remove(bucket, db) {
    const params = { db: db.name }
    if (bucket) params.bucket = bucket
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  top(id, type) {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/top?id=${id}&type=${type}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  }
}
