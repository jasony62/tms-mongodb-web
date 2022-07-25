import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'

type ApiRst = {
  data: { result: any }
}

export default {
  list(bucket: any) {
    const base = BACK_API_URL() + '/admin/tag'
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then((rst: { data: { result: any } }) => rst.data.result)
  },
  create(bucket: any, proto: any) {
    const base = BACK_API_URL() + '/admin/tag'
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  update(bucket: any, tag: any) {
    const base = BACK_API_URL() + '/admin/tag'
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update?id=${tag._id}`, tag, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  remove(bucket: any, tag: { name: any }) {
    const base = BACK_API_URL() + '/admin/tag'
    const params = { bucket, name: tag.name }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
}
