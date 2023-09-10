import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'

type ApiRst = {
  data: { result: any }
}
export default {
  /**
   * 数据库插件
   * @param bucket 存储空间名称
   * @returns 可用插件列表
   */
  getDatabasePlugins(bucket: string | undefined) {
    const base = BACK_API_URL() + '/plugins'
    const params = { bucket }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list?scope=database`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  /**
   * 集合插件
   * @param bucket 存储空间名称
   * @param db 数据库名称
   * @param cl 集合名称
   * @returns 可用插件列表
   */
  getCollectionPlugins(bucket: string | undefined, db: string) {
    const base = BACK_API_URL() + '/plugins'
    const params = { bucket, db }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/list?scope=collection`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  /**
   * 针对指定集合中的文档的插件
   * @param bucket 存储空间名称
   * @param db 数据库名称
   * @param cl 集合名称
   * @returns 可用插件列表
   */
  getCollectionDocPlugins(bucket: string | undefined, db: string, cl: string) {
    const base = BACK_API_URL() + '/plugins'
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
    const base = BACK_API_URL() + '/plugins'
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
    const base = BACK_API_URL() + '/plugins'
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
