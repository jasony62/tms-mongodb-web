import { TmsAxios } from 'tms-vue3'

const base = (import.meta.env.VITE_BACK_API_BASE || '') + '/admin/bucket/coworker'
type ApiRst = {
  data: { result: any }
}
export default {
  accept(bucket:any, nickname:string, code:any) {
    const params = { nickname, code }
    return TmsAxios.ins()
      .post(`${base}/accept?bucket=${bucket}`, { params })
      .then((rst:ApiRst) => rst.data.result)
  },
}
