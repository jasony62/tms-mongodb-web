import { TmsAxios } from 'tms-vue3'

const base = (import.meta.env.VITE_BACK_API_BASE || '') + '/admin/schema'

export default {
  list(bucket, scope) {
    const type = typeof scope === 'object' ? scope.join(',') : scope
    const params = { bucket, scope: type }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then((rst) => rst.data.result)
  },
  listSimple(bucket) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/listSimple`, { params })
      .then((rst) => rst.data.result)
  },
  create(bucket, proto) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then((rst) => rst.data.result)
  },
  update(bucket, schema, updated) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update?id=${schema._id}`, updated, { params })
      .then((rst) => rst.data.result)
  },
  remove(bucket, schema) {
    const params = { bucket, id: schema._id }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then((rst) => rst.data.result)
  },
  listByTag(bucket, tagName) {
    const params = { bucket, tag: tagName }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/listByTag`, { params })
      .then((rst) => rst.data.result)
  },
}
