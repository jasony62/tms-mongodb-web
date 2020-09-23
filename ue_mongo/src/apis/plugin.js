const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/plugin'

export default function create(tmsAxios) {
  return {
    getPlugins() {
      return tmsAxios
        .get(`${base}/pluginDocument`)
        .then(rst => rst.data.result)
    },
    handlePlugin() {
      return tmsAxios
        .post(`${base}/commonExecute`, arguments[0], { params: arguments[1] })
        .then(rst => rst.data.result)
    }
  }
}
