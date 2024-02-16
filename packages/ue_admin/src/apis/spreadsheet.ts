import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'
import { ApiRst } from './types'

export default {
  get _baseApi() {
    return BACK_API_URL() + '/admin/spreadsheet'
  },
  /**
   *
   * @param spreadsheetId
   * @param socketid
   * @returns
   */
  subscribe(spreadsheetId: string, socketid: any) {
    const params = { socketid, spreadsheetId }
    return TmsAxios.ins('mongodb-api')
      .get(`${this._baseApi}/subscribe`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  /**
   *
   * @param spreadsheetId
   * @param socketid
   * @returns
   */
  unsubscribe(spreadsheetId: string, socketid: any) {
    const params = { socketid, spreadsheetId }
    return TmsAxios.ins('mongodb-api')
      .get(`${this._baseApi}/unsubscribe`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  /**
   *
   * @param bucket
   * @param dbName
   * @param id
   * @returns
   */
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
  list(bucket: string | undefined, dbName: string, clName?: string) {
    const params = { bucket, db: dbName, cl: clName }
    return TmsAxios.ins('mongodb-api')
      .get(`${this._baseApi}/list`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  /**
   *
   * @param bucket
   * @param dbName
   * @param proto
   * @returns
   */
  create(bucket: string, dbName: string, clName?: string, proto?: any) {
    const params = { bucket, db: dbName, cl: clName }
    return TmsAxios.ins('mongodb-api')
      .post(`${this._baseApi}/create`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  /**
   *
   * @param bucket
   * @param dbName
   * @param id
   * @param ver
   * @param delta
   * @returns
   */
  save(bucket: string, dbName: string, id: string, ver: number, delta: any) {
    const params = { bucket, db: dbName, id }
    return TmsAxios.ins('mongodb-api')
      .post(`${this._baseApi}/save`, { ver, delta }, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
}
