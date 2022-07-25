import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'

type ApiRst = {
  data: { result: any }
}
export default {
  byName(bucket: any, dbName?: string, clName?: string) {
    const base = BACK_API_URL() + '/admin/collection'
    const params = { bucket, db: dbName, cl: clName }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/byName`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  /**
   *
   * @param {*} dbName
   */
  list(bucket: any, dbName: string, { keyword, page, size }: any = {}) {
    const base = BACK_API_URL() + '/admin/collection'
    const params = { bucket, db: dbName, keyword, page, size }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  create(bucket: any, dbName: string, proto?: any) {
    const base = BACK_API_URL() + '/admin/collection'
    const params = { bucket, db: dbName }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  update(bucket: any, dbName: string, clName: string, proto?: any) {
    const base = BACK_API_URL() + '/admin/collection'
    const params = { bucket, db: dbName, cl: clName }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  remove(bucket: any, dbName: string, clName: string) {
    const base = BACK_API_URL() + '/admin/collection'
    const params = { bucket, db: dbName, cl: clName }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
}
