
const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/plugins/index'
export default function create(tmsAxios) {
  return {
    getPlugins() {
      return tmsAxios.get(`${base}/pluginDocument`).then(rst => rst.data.result)
    },
    handlePlugin(...args) {
      return tmsAxios
        .post(`${base}/commonExecute`, args[0], { params: args[1] })
        .then(rst => rst.data.result)
    }
  }
}
