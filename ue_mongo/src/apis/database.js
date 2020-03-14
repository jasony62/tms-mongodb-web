import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/db'

export default {
  list() {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  create(proto) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  update(dbName, updated) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update?db=${dbName}`, updated)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  remove(db) {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove?db=${db.name}`)
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
