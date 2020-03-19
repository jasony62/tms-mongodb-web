import { TmsAxios } from 'tms-vue'

const base = process.env.VUE_APP_BACK_API_PLUGIN || ''

export default {
  syncMobilePool(dbName, clName, transforms, param, pTotal, aSTotal, aSPTotal, num=100) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/syncMobilePool/syncMobile?db=${dbName}&cl=${clName}&transforms=${transforms}&planTotal=${pTotal}&alreadySyncTotal=${aSTotal}&alreadySyncPassTotal=${aSPTotal}&execNum=${num}`, param)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  }
}