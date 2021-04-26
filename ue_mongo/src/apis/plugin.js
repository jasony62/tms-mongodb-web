const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/plugins'
export default function create(tmsAxios) {
  return {
    getPlugins(bucket, db, cl) {
      //return tmsAxios.get(`${base}/pluginDocument`).then(rst => rst.data.result)
      return tmsAxios
        .get(`${base}/list?scope=document`, { params: { bucket, db, cl } })
        .then(rst => rst.data.result)
    },
    /**
     * 执行插件处理功能
     * @param {object} params - http请求查询参数
     * @param {object} body - http请求消息体
     */
    execute(params, body) {
      return (
        tmsAxios
          // .post(`${base}/commonExecute`, args[0], { params: args[1] })
          .post(`${base}/execute`, body, { params })
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
    remoteWidgetOptions(bucket, db, cl, plugin, criteria = {}) {
      return tmsAxios
        .post(
          `${base}/remoteWidgetOptions`,
          { filter: criteria },
          {
            params: { bucket, db, cl, plugin }
          }
        )
        .then(rst => rst.data.result)
    }
  }
}
