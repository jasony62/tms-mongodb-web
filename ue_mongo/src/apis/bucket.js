import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/bucket'

export default {
  /**
   * 返回当前用户可用的bucket
   */
  list() {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list`)
      .then(rst => rst.data.result)
  }
}
