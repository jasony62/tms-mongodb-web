import { TmsAxios } from 'tms-vue3'

const base = (import.meta.env.VITE_BACK_API_BASE || '') + '/admin/replica'

export default {
  list(bucket: any, { keyword, page, size }: any = {}, proto: any) {
    const params = { bucket, keyword, page, size }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/list`, proto, { params })
      .then((rst: any) => rst.data.result)
  },
  create(bucket: any, proto: any) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then((rst: any) => rst.data.result)
  },
  remove(bucket: any, proto: any) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/remove`, proto, { params })
      .then((rst: any) => rst.data.result)
  },
  synchronize(bucket: any, proto: any) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/synchronize`, proto, { params })
      .then((rst: any) => rst.data.result)
  },
}
