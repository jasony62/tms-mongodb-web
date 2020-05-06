import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/document'

export default {
  byColumnVal(dbName, clName, columnName, filter= {}, orderBy= {}, page, size) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/getGroupByColumnVal?db=${dbName}&cl=${clName}&column=${columnName}&page=${page}&size=${size}`, {filter, orderBy})
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  list(dbName, clName, page, filter = {}, orderBy = {}) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/list?db=${dbName}&cl=${clName}&page=${page.at}&size=${page.size}`, {filter, orderBy})
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
  batchUpdate(dbName, clName, param) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/updateMany?db=${dbName}&cl=${clName}`, param)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  remove(dbName, clName, id) {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove?db=${dbName}&cl=${clName}&id=${id}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  batchRemove(dbName, clName, param) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/removeMany?db=${dbName}&cl=${clName}`, param)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  move(oldDbName, oldClName, dbName, clName, transfroms, param, pTotal, aMTotal, aMPTotal, execNum=100) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/move?oldDb=${oldDbName}&oldCl=${oldClName}&newDb=${dbName}&newCl=${clName}&transforms=${transfroms}&planTotal=${pTotal}&alreadyMoveTotal=${aMTotal}&alreadyMovePassTotal=${aMPTotal}&execNum=${execNum}`, param)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  import(dbName, clName, file, config) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/uploadToImport?db=${dbName}&cl=${clName}`, file, config)
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
  }
}
