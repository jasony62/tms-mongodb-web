import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'
import { ApiRst } from './types'

export default {
  accept(bucket: any, nickname: string, code: any) {
    const base = BACK_API_URL() + '/admin/bucket/coworker'
    const params = { nickname, code }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/accept?bucket=${bucket}`, params)
      .then((rst: ApiRst) => rst.data.result)
  },
  invite(bucket: any, nickname: string) {
    const base = BACK_API_URL() + '/admin/bucket/coworker'
    const params = { nickname }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/invite?bucket=${bucket}`, params)
      .then((rst: ApiRst) => rst.data.result)
  },
  remove(bucket: any, nickname: string) {
    const base = BACK_API_URL() + '/admin/bucket/coworker'
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove?bucket=${bucket}&coworker=${nickname}`)
      .then((rst: ApiRst) => rst.data.result)
  },
}
