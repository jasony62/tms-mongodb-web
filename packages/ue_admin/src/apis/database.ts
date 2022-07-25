import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'

type ApiRst = {
  data: { result: any }
}

type DbResult = {
  _id: string
  title: string
  description: string
}

export default {
  list(bucket: any, keyword?: string, batchArg?: any) {
    const base = BACK_API_URL() + '/admin/db'
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params: { bucket, keyword, ...batchArg } })
      .then((rst: ApiRst) => rst.data.result)
  },
  create(bucket: any, proto: any) {
    const base = BACK_API_URL() + '/admin/db'
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  update(bucket: any, updated: any) {
    const base = BACK_API_URL() + '/admin/db'
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update`, updated, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  remove(bucket: any, db: { name: any }) {
    const base = BACK_API_URL() + '/admin/db'
    const params = { bucket, db: db.name }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
}
