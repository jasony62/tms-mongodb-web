import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/admin/document'

export default {
  byColumnVal(
    bucket,
    dbName,
    clName,
    columnName,
    filter = {},
    orderBy = {},
    page,
    size
  ) {
    const params = {
      bucket,
      db: dbName,
      cl: clName,
      column: columnName,
      page: page,
      size: size
    }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/getGroupByColumnVal`, { filter, orderBy }, { params })
      .then(rst => rst.data.result)
  },
  list(bucket, dbName, clName, orderBy = {}, filter = {}, page) {
    const params = {
      bucket,
      db: dbName,
      cl: clName,
      page: page.at,
      size: page.size
    }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/list`, { orderBy, filter }, { params })
      .then(rst => rst.data.result)
  },
  create(bucket, dbName, clName, proto) {
    const params = {
      bucket,
      db: dbName,
      cl: clName
    }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/create`, proto, { params })
      .then(rst => rst.data.result)
  },
  update(bucket, dbName, clName, id, updated) {
    const params = {
      bucket,
      db: dbName,
      cl: clName,
      id
    }
    return TmsAxios.ins('mongodb-api')
      .post(`${base}/update`, updated, { params })
      .then(rst => rst.data.result)
  },
  remove(bucket, dbName, clName, id) {
    const params = {
      bucket,
      db: dbName,
      cl: clName,
      id
    }
    return TmsAxios.ins('mongodb-api')
      .get(`${base}/remove`, { params })
      .then(rst => rst.data.result)
	},
	upload(query, fileData, config) {
		let url = `${process.env.VUE_APP_BACK_API_BASE}/upload/plain`
    if (query && query.dir) url += `?dir=${query.dir}`
		return TmsAxios.ins('mongodb-api')
			.post(url, fileData, config)
			.then(rst => rst.data.result)
	}
}
