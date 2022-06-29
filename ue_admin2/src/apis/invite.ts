import { TmsAxios } from 'tms-vue3'

const base =
  (import.meta.env.VITE_BACK_API_BASE || '') + '/admin/bucket/coworker'
type ApiRst = {
  data: { result: any }
}
export default {
  accept(bucket: any, nickname: string, code: any) {
    const params = { nickname, code }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/accept?bucket=${bucket}`, params)
      .then((rst: ApiRst) => rst.data.result)
  },
  invite(bucket: any, nickname: string) {
    const params = { nickname }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/invite?bucket=${bucket}`, params)
      .then((rst: ApiRst) => rst.data.result)
  },
  remove(bucket: any, nickname: string) {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove?bucket=${bucket}&coworker=${nickname}`)
      .then((rst: ApiRst) => rst.data.result)
  },
}
