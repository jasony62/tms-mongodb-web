import { TmsAxios } from 'tms-vue3'

const base = (import.meta.env.VITE_BACK_API_BASE || '') + '/admin/tag'

type ApiRst = {
  data: { result: any }
}

export default {
  list(bucket: any) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then((rst: { data: { result: any } }) => rst.data.result)
  },
  create(bucket: any, proto: any) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  update(bucket: any, tag: any) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update?id=${tag._id}`, tag, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  remove(bucket: any, tag: { name: any }) {
    const params = { bucket, name: tag.name }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
}
