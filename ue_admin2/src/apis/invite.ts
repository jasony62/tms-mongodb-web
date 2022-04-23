import { TmsAxios } from 'tms-vue3'

const base =
  (import.meta.env.VITE_BACK_API_BASE || '') + '/admin/bucket/coworker'

export default {
  accept(bucket, nickname, code) {
    const params = { nickname, code }
    return TmsAxios.ins()
      .post(`${base}/accept?bucket=${bucket}`, { params })
      .then((rst) => rst.data.result)
  },
}
