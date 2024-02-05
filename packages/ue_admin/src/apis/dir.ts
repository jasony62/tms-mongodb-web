import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'
import { ApiRst } from './types'

export default {
  get _baseApi() {
    return BACK_API_URL() + '/admin/dir'
  },
  list(bucket: string | undefined, dbName: string) {
    const params = { bucket, db: dbName }
    return TmsAxios.ins('mongodb-api')
      .get(`${this._baseApi}/list`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  create(bucket: string | undefined, dbName: string, proto: any) {
    const params = { bucket, db: dbName }
    return TmsAxios.ins('mongodb-api')
      .post(`${this._baseApi}/create`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  update(bucket: string | undefined, dbName: string, newClDir: any) {
    const id = newClDir._id
    const params = { bucket, db: dbName, id }
    const updated = JSON.parse(JSON.stringify(newClDir))
    delete updated._id
    return TmsAxios.ins('mongodb-api')
      .post(`${this._baseApi}/update`, updated, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  remove(bucket: string | undefined, dbName: string, id: string) {
    const params = { bucket, db: dbName, id }
    return TmsAxios.ins('mongodb-api')
      .get(`${this._baseApi}/remove`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
}
