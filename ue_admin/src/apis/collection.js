import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/admin/collection'

export default {
  byName(bucket, dbName, clName) {
    const params = { bucket, db: dbName, cl: clName }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/byName`, { params })
      .then(rst => rst.data.result)
  },
  /**
   *
   * @param {*} dbName
   */
  list(bucket, dbName, { keyword, page, size } = {}) {
    const params = { bucket, db: dbName, keyword, page, size }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then(rst => rst.data.result)
  },
  create(bucket, dbName, proto) {
    const params = { bucket, db: dbName }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then(rst => rst.data.result)
  },
  update(bucket, dbName, clName, proto) {
    const params = { bucket, db: dbName, cl: clName }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update`, proto, { params })
      .then(rst => rst.data.result)
  },
  remove(bucket, dbName, clName) {
    const params = { bucket, db: dbName, cl: clName }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then(rst => rst.data.result)
  }
}
