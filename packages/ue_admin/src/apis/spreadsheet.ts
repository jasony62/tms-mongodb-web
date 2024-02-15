import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'
import { ApiRst } from './types'

export default {
  get _baseApi() {
    return BACK_API_URL() + '/admin/spreadsheet'
  },
  byId(bucket: any, dbName: string, id: string) {
    const params = { bucket, db: dbName, id }
    return TmsAxios.ins('mongodb-api')
      .get(`${this._baseApi}/byId`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  /**
   *
   * @param {*} dbName
   */
  list(bucket: string | undefined, dbName: string) {
    const params = { bucket, db: dbName }
    return TmsAxios.ins('mongodb-api')
      .get(`${this._baseApi}/list`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  create(bucket: string, dbName: string, proto?: any) {
    const params = { bucket, db: dbName }
    return TmsAxios.ins('mongodb-api')
      .post(`${this._baseApi}/create`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  save(bucket: string, dbName: string, id: string, ver: number, delta: any) {
    const params = { bucket, db: dbName, id }
    return TmsAxios.ins('mongodb-api')
      .post(`${this._baseApi}/save`, { ver, delta }, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
}
