import { TmsAxios } from 'tms-vue'

const base = '/mgdb/api/mongo/document'

export default {
  list(dbName, clName, page, filter) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/list?db=${dbName}&cl=${clName}&page=${page.at}&size=${page.size}`, filter)
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
  batchUpdate(dbName, clName, updated) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/updateBatch?db=${dbName}&cl=${clName}`, updated)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  remove(dbName, clName, id) {
    return TmsAxios.ins('mongodb-api')
      .delete(`${base}/remove?db=${dbName}&cl=${clName}&id=${id}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  batchRemove(dbName, clName, ids) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/removeMany?db=${dbName}&cl=${clName}`, {'ids': ids})
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  move(oldDbName, oldClName, dbName, clName, ids) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/move?oldDb=${oldDbName}&oldCl=${oldClName}&newDb=${dbName}&newCl=${clName}`, ids)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  export(dbName, clName) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/export?db=${dbName}&cl=${clName}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  download(params) {
    return TmsAxios.ins('mongodb-api')
      .get('/mgdb/api/download/down', {params})
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  listByRule(olddbName, oldclName, ruleDbName, ruleClName) {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/getDocsByRule?db=${olddbName}&cl=${oldclName}&ruleDb=${ruleDbName}&ruleCl=${ruleClName}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  movebyRule(newdbName, newclName, olddbName, oldclName, ruleDbName, ruleClName, docIds) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/moveByRule?newDb=${newdbName}&newCl=${newclName}&oldDb=${olddbName}&oldCl=${oldclName}&ruleDb=${ruleDbName}&ruleCl=${ruleClName}&markResultColumn=import_status`, docIds)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  }
}
