import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/admin/db'

export default {
  list (bucket) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then(rst => rst.data.result)
  },
  create (bucket, proto) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then(rst => rst.data.result)
  },
  update (bucket, dbName, updated) {
    const params = { bucket, db: dbName }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update`, updated, { params })
      .then(rst => rst.data.result)
  },
  remove (bucket, db) {
    const params = { bucket, db: db.name }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then(rst => rst.data.result)
  }
}
