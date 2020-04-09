import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/admin/schema'

export default {
  list(scope) {
    const type = typeof(scope) === 'object' ? scope.join(',') : scope
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list?scope=${type}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  listSimple() {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/listSimple`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  create(proto) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  update(schema, updated) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update?id=${schema._id}`, updated)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  remove(schema) {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove?id=${schema._id}`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  }
}
