import { TmsAxios } from 'tms-vue'

const base = '/mgdb/api/admin/document'

export default {
  list(dbName, clName) {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list?db=${dbName}&cl=${clName}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  create(dbName, clName, proto) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create?db=${dbName}&cl=${clName}`, proto)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  update(dbName, clName, id, updated) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update?db=${dbName}&cl=${clName}&id=${id}`, updated)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  remove(dbName, clName, id) {
    return TmsAxios.ins('mongodb-api')
      .delete(`${base}/remove?db=${dbName}&cl=${clName}&id=${id}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  }
}
