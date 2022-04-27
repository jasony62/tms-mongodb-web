import { TmsAxios } from 'tms-vue3'

const base = (import.meta.env.VITE_BACK_API_BASE || '') + '/admin/document'
let uploadUrl = (import.meta.env.VITE_BACK_API_BASE || '') + '/upload/plain'

type ApiRst = {
  data: { result: any }
}

export default {
  byColumnVal(
    bucket: any,
    dbName: string,
    clName: string,
    columnName: string,
    page: string,
    size: string,
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
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/getGroupByColumnVal`, { filter, orderBy }, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  list(bucket: any, dbName: string, clName: string, batchArg?: any) {
    const params = {
      bucket,
      db: dbName,
      cl: clName,
      ...batchArg,
    }
    return TmsAxios.ins('mongodb-api')
      .post(
        `${base}/list`,
        {},
        {
          params,
        }
      )
      .then((rst: ApiRst) => rst.data.result)
  },
  create(bucket: any, dbName: string, clName: string, proto: any) {
    const params = {
      bucket,
      db: dbName,
      cl: clName,
    }
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
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then((rst: ApiRst) => rst.data.result)
  },
  upload(query: any, fileData: any, config: any) {
    if (query && query.dir) uploadUrl += `?dir=${query.dir}`
    return TmsAxios.ins('mongodb-api')
      .post(uploadUrl, fileData, config)
      .then((rst: ApiRst) => rst.data.result)
  },
}
