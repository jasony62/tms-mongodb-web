import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'

type ApiRst = {
  data: { result: any }
}
export default {
  list(bucket: any, { keyword, page, size }: any = {}, proto: any = {}) {
    const base = BACK_API_URL() + '/admin/replica'
    const params = { bucket, keyword, page, size }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/list`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  create(bucket: any, proto: any) {
    const base = BACK_API_URL() + '/admin/replica'
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  remove(bucket: any, proto: any) {
    const base = BACK_API_URL() + '/admin/replica'
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/remove`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  synchronize(bucket: any, proto: any) {
    const base = BACK_API_URL() + '/admin/replica'
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/synchronize`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
}
