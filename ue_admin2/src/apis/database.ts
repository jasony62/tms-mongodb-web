import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'

const base = BACK_API_URL() + '/admin/db'

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
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params: { bucket, keyword, ...batchArg } })
      .then((rst: ApiRst) => rst.data.result)
  },
  create(bucket: any, proto: any) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  update(bucket: any, updated: any) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update`, updated, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  remove(bucket: any, db: { name: any }) {
    const params = { bucket, db: db.name }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
}
