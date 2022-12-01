import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'

export default {
  /**
   * 获得匹配的etl插件
   * @param bucket
   * @param dbName
   * @param clName
   * @param scope
   * @returns
   */
  findForDst(
    bucket: string | undefined,
    dbName: string,
    clName: string,
    scope: string
  ) {
    const base = BACK_API_URL() + '/admin/etl'
    const params = { bucket, db: dbName, cl: clName, scope }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/findForDst`, { params })
      .then((rst: { data: { result: any } }) => rst.data.result)
  },
  /**
   * 根据指定etl获得转换的数据
   * @param bucket
   * @param etlid
   * @param docIds
   * @returns
   */
  transform(bucket: string | undefined, etlid: string, docIds: string[]) {
    const base = BACK_API_URL() + '/admin/etl'
    const params = { bucket, etlid }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/transform`, { docIds }, { params })
      .then((rst: { data: { result: any } }) => rst.data.result)
  },
}
