import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'
import { ApiRst } from './types'

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
  list(
    bucket: string | undefined,
    dbName: string,
    { dirFullName, keyword, page, size }: any = {}
  ) {
    const base = BACK_API_URL() + '/admin/collection'
    const params = { bucket, db: dbName, dirFullName, keyword, page, size }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  create(bucket: string, dbName: string, proto?: any) {
    const base = BACK_API_URL() + '/admin/collection'
    const params = { bucket, db: dbName }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  update(bucket: string, dbName: string, clName: string, proto?: any) {
    const base = BACK_API_URL() + '/admin/collection'
    const params = { bucket, db: dbName, cl: clName }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  remove(bucket: string, dbName: string, clName: string) {
    const base = BACK_API_URL() + '/admin/collection'
    const params = { bucket, db: dbName, cl: clName }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  /**
   * 清空集合中的文档
   * @param bucket
   * @param dbName
   * @param clName
   * @returns
   */
  empty(bucket: any, dbName: string, clName: string) {
    const base = BACK_API_URL() + '/admin/document'
    const params = { bucket, db: dbName, cl: clName }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/removeMany`, { filter: 'all' }, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
}
