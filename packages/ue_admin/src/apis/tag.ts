import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'
import { ApiRst } from './types'

export default {
  get _baseApi() {
    return BACK_API_URL() + '/admin/tag'
  },
  list(bucket: string | undefined) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${this._baseApi}/list`, {}, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  create(bucket: string | undefined, proto: any) {
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .post(`${this._baseApi}/create`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
}
