import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/admin/bucket/coworker'

export default {
  accept(bucket, nickname, code) {
    const params = { nickname, code }
    return TmsAxios.ins()
      .post(`${base}/accept?bucket=${bucket}`, { params })
      .then(rst => rst.data.result)
  },
}