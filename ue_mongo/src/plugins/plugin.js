import { TmsAxios } from 'tms-vue'

const base = process.env.VUE_APP_BACK_API_BASE || ''

export default {
  list () {
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/pluginInfo/getPlugins`)
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  },
  usePlugin (
    submit,
    dbName,
    clName,
    transforms,
    param,
    pTotal,
    aSTotal,
    aSPTotal,
    num = 100
  ) {
    let baseUrl = `${base}${submit.path}`
    submit.path.search('?') != -1 ? (baseUrl += '&') : (baseUrl += '?')
    return TmsAxios.ins('mongodb-api')
      .post(
        `${baseUrl}db=${dbName}&cl=${clName}&transforms=${transforms}&planTotal=${pTotal}&alreadySyncTotal=${aSTotal}&alreadySyncPassTotal=${aSPTotal}&execNum=${num}`,
        param
      )
      .then(rst => rst.data.result)
      .catch(err => Promise.reject(err))
  }
}
