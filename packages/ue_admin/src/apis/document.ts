import { TmsAxios } from 'tms-vue3'
import { BACK_API_URL } from '@/global'

type ApiRst = {
  data: { result: any }
}

export default {
  byColumnVal(
    bucket: any,
    dbName: string,
    clName: string,
    columnName: string,
    page: number,
    size: number,
    filter?: {},
    orderBy?: {}
  ) {
    const params = {
      bucket,
      db: dbName,
      cl: clName,
      column: columnName,
      page: page,
      size: size,
    }
    const base = BACK_API_URL() + '/admin/document'
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/getGroupByColumnVal`, { filter, orderBy }, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  list(
    bucket: any,
    dbName: string,
    clName: string,
    gatherArgs: any,
    batchArg?: any
  ) {
    const params = {
      bucket,
      db: dbName,
      cl: clName,
      ...batchArg,
    }
    const base = BACK_API_URL() + '/admin/document'
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/list`, gatherArgs, {
        params,
      })
      .then((rst: ApiRst) => rst.data.result)
  },
  get(bucket: any, dbName: string, clName: string, docId: string) {
    const params = {
      bucket,
      db: dbName,
      cl: clName,
      id: docId,
    }
    const base = BACK_API_URL() + '/admin/document'
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/get`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  create(bucket: any, dbName: string, clName: string, proto: any) {
    const params = {
      bucket,
      db: dbName,
      cl: clName,
    }
    const base = BACK_API_URL() + '/admin/document'
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  update(
    bucket: any,
    dbName: string,
    clName: string,
    id: string,
    updated: any
  ) {
    const params = {
      bucket,
      db: dbName,
      cl: clName,
      id,
    }
    const base = BACK_API_URL() + '/admin/document'
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update`, updated, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  remove(bucket: any, dbName: string, clName: string, id: string) {
    const params = {
      bucket,
      db: dbName,
      cl: clName,
      id,
    }
    const base = BACK_API_URL() + '/admin/document'
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  upload(query: any, fileData: any, config: any) {
    const uploadUrl = BACK_API_URL() + '/upload/plain'
    let url = uploadUrl
    if (query?.dir) url += `?dir=${query.dir}`
    return TmsAxios.ins('mongodb-api')
      .post(url, fileData, config)
      .then((rst: ApiRst) => rst.data.result)
  },
  export(
    bucket: string,
    dbName: string,
    clName: string,
    { docIds, columns, exportType }: any
  ) {
    const params = { bucket, db: dbName, cl: clName }
    const base = BACK_API_URL() + '/admin/document'
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/export`, { docIds, columns, exportType }, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
}
