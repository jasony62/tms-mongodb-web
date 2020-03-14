import { TmsAxios } from 'tms-vue'

const base = '/mgdb/api/admin/document'

export default {
  byColumnVal(dbName, clName, columnName, filter= {}, orderBy= {}, page, size) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/getGroupByColumnVal?db=${dbName}&cl=${clName}&column=${columnName}&page=${page}&size=${size}`, {filter, orderBy})
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  list(dbName, clName, orderBy = {}, filter= {}, page) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/list?db=${dbName}&cl=${clName}&page=${page.at}&size=${page.size}`, {orderBy, filter})
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
      .post(`${base}/remove?db=${dbName}&cl=${clName}&id=${id}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  }
}
