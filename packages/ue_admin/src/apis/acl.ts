import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'
import { ApiRst } from './types'

export default {
  get _baseApi() {
    return BACK_API_URL() + '/admin/acl'
  },
  add(target: any, user: any) {
    return TmsAxios.ins('mongodb-api')
      .post(`${this._baseApi}/add`, { target, user })
      .then((rst: ApiRst) => rst.data.result)
  },
  remove(target: any, user: any) {
    return TmsAxios.ins('mongodb-api')
      .post(`${this._baseApi}/remove`, { target, user })
      .then((rst: ApiRst) => rst.data.result)
  },
  list(target: any) {
    return TmsAxios.ins('mongodb-api')
      .post(`${this._baseApi}/list`, { target })
      .then((rst: ApiRst) => rst.data.result)
  },
}
