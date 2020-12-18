const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/plugins'
export default function create(tmsAxios) {
  return {
    getPlugins() {
      //return tmsAxios.get(`${base}/pluginDocument`).then(rst => rst.data.result)
      return tmsAxios
        .get(`${base}/list?scope=document`)
        .then(rst => rst.data.result)
    },
    handlePlugin(...args) {
      return (
        tmsAxios
          // .post(`${base}/commonExecute`, args[0], { params: args[1] })
          .post(`${base}/execute`, args[0], { params: args[1] })
          .then(rst => rst.data.result)
      )
    },
    /**
     *
     * @param {string} bucket - 用户存储空间名称
     * @param {string} db - 数据名称
     * @param {string} cl - 集合名称
     * @param {string} plugin - 插件名称
     * @param {object} filter - 筛选条件
     */
    remotePreCondition(bucket, db, cl, plugin, filter) {
      return tmsAxios
        .post(
          `${base}/remotePreCondition`,
          { filter },
          {
            params: { bucket, db, cl, plugin }
          }
        )
        .then(rst => rst.data.result)
    }
  }
}
