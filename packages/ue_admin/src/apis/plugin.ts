import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'

const base = BACK_API_URL() + '/plugins'

type ApiRst = {
  data: { result: any }
}
export default {
  getPlugins(bucket: any, db: string, cl: string) {
    const params = { bucket, db, cl }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list?scope=document`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  /**
   * 执行插件处理功能
   * @param {object} params - http请求查询参数
   * @param {object} body - http请求消息体
   */
  execute(params: any, body: any) {
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/execute`, body, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  /**
   *
   * @param {any} bucket - 用户存储空间名称
   * @param {string} db - 数据名称
   * @param {string} cl - 集合名称
   * @param {string} plugin - 插件名称
   * @param {object} filter - 筛选条件
   */
  remoteWidgetOptions(
    bucket: any,
    db: string,
    cl: string,
    plugin: string,
    criteria = {}
  ) {
    return TmsAxios.ins('mongodb-api')
      .post(
        `${base}/remoteWidgetOptions`,
        { filter: criteria },
        {
          params: { bucket, db, cl, plugin },
        }
      )
      .then((rst: ApiRst) => rst.data.result)
  },
}
