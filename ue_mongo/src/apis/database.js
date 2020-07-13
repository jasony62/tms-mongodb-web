const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/db'

export default function create(tmsAxios) {
  return {
    list(bucket) {
      const params = { bucket }
      return tmsAxios
        .get(`${base}/list`, { params })
        .then(rst => rst.data.result)
    },
    create(bucket, proto) {
      const params = { bucket }
      return tmsAxios
        .post(`${base}/create`, proto, { params })
        .then(rst => rst.data.result)
    },
    update(bucket, dbName, updated) {
      const params = { bucket, db: dbName }
      return tmsAxios
        .post(`${base}/update`, updated, { params })
        .then(rst => rst.data.result)
    },
    remove(bucket, db) {
      const params = { bucket, db: db.name }
      return tmsAxios
        .get(`${base}/remove`, { params })
        .then(rst => rst.data.result)
    },
    top(bucket, id, type) {
      const params = { bucket, id, type }
      return tmsAxios
        .get(`${base}/top`, { params })
        .then(rst => rst.data.result)
    }
  }
}
