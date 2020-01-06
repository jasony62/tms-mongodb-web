import { TmsAxios } from 'tms-vue'

const base = '/mgdb/api/admin/collection'

export default {
  byName(dbName, clName) {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/byName?db=${dbName}&cl=${clName}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  /**
   *
   * @param {*} db
   */
  list(db) {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list?db=${db}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  create(dbName, proto) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create?db=${dbName}`, proto)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  update(dbName, clName, proto) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update?db=${dbName}&cl=${clName}`, proto)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  remove(dbName, clName) {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove?db=${dbName}&cl=${clName}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  }
}
