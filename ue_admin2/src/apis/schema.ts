import { TmsAxios } from 'tms-vue3'

const base = (import.meta.env.VITE_BACK_API_BASE || '') + '/admin/schema'
type ApiRst = {
  data: { result: any }
}
export default {
  list(bucket:any, scope:any) {
    const type = typeof scope === 'object' ? scope.join(',') : scope
    const params = { bucket, scope: type }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then((rst:ApiRst) => rst.data.result)
  },
  listSimple(bucket:any) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/listSimple`, { params })
      .then((rst:ApiRst) => rst.data.result)
  },
  create(bucket:any, proto:any) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then((rst:ApiRst) => rst.data.result)
  },
  update(bucket:any, schema:any, updated:any) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update?id=${schema._id}`, updated, { params })
      .then((rst:ApiRst) => rst.data.result)
  },
  remove(bucket:any, schema:any) {
    const params = { bucket, id: schema._id }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then((rst:ApiRst) => rst.data.result)
  },
  listByTag(bucket:any, tagName:string) {
    const params = { bucket, tag: tagName }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/listByTag`, { params })
      .then((rst:ApiRst) => rst.data.result)
  },
}
