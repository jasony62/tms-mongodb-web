import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/collection'

export default {
  byName(bucketName, dbName, clName) {
    const params = { db: dbName, cl: clName }
    if (bucketName) params.bucket = bucketName
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/byName`, { params })
      .then(rst => rst.data.result)
  },
  /**
   *
   * @param {*} dbName
   */
  list(bucketName, dbName) {
    const params = { db: dbName }
    if (bucketName) params.bucket = bucketName
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then(rst => rst.data.result)
  },
  create(bucketName, dbName, proto) {
    const params = { db: dbName }
    if (bucketName) params.bucket = bucketName
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then(rst => rst.data.result)
  },
  update(bucketName, dbName, clName, proto) {
    const params = { db: dbName, cl: clName }
    if (bucketName) params.bucket = bucketName
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update`, proto, { params })
      .then(rst => rst.data.result)
  },
  remove(bucketName, dbName, clName) {
    const params = { db: dbName, cl: clName }
    if (bucketName) params.bucket = bucketName
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then(rst => rst.data.result)
  }
}
