const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/document'

export default function create(tmsAxios) {
  return {
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
      return tmsAxios
        .post(`${base}/getGroupByColumnVal`, { filter, orderBy }, { params })
        .then(rst => rst.data.result)
    },
    list(bucket, dbName, clName, page, filter = {}, orderBy = {}) {
      const params = {
        bucket,
        db: dbName,
        cl: clName,
        page: page.at || page.page,
        size: page.size
      }
      return tmsAxios
        .post(`${base}/list`, { filter, orderBy }, { params })
        .then(rst => rst.data.result)
    },
    create(bucket, dbName, clName, proto) {
      const params = { bucket, db: dbName, cl: clName }
      return tmsAxios
        .post(`${base}/create`, proto, { params })
        .then(rst => rst.data.result)
    },
    update(bucket, dbName, clName, id, updated) {
      const params = { bucket, db: dbName, cl: clName, id }
      return tmsAxios
        .post(`${base}/update`, updated, { params })
        .then(rst => rst.data.result)
    },
    batchUpdate(bucket, dbName, clName, updatedRange) {
      const params = { bucket, db: dbName, cl: clName }
      return tmsAxios
        .post(`${base}/updateMany`, updatedRange, { params })
        .then(rst => rst.data.result)
    },
    remove(bucket, dbName, clName, id) {
      const params = { bucket, db: dbName, cl: clName, id }
      return tmsAxios
        .get(`${base}/remove`, { params })
        .then(rst => rst.data.result)
    },
    batchRemove(bucket, dbName, clName, removedRange) {
      const params = { bucket, db: dbName, cl: clName }
      return tmsAxios
        .post(`${base}/removeMany`, removedRange, { params })
        .then(rst => rst.data.result)
    },
    copyMany(bucket, dbName, clName, toDbName, toClName, copyedRange) {
      const params = {
        bucket,
        db: dbName,
        cl: clName,
        toDb: toDbName,
        toCl: toClName
      }
      return tmsAxios
        .post(`${base}/copyMany`, copyedRange, { params })
        .then(rst => rst.data.result)
    },
    move(
      bucket,
      oldDbName,
      oldClName,
      dbName,
      clName,
      transfroms,
      movedRange,
      pTotal,
      aMTotal,
      aMPTotal,
      execNum = 100
    ) {
      const params = {
        bucket,
        oldDb: oldDbName,
        oldCl: oldClName,
        newDb: dbName,
        newCl: clName,
        transforms: transfroms,
        planTotal: pTotal,
        alreadyMoveTotal: aMTotal,
        alreadyMovePassTotal: aMPTotal,
        execNum: execNum
      }
      return tmsAxios
        .post(`${base}/move`, movedRange, { params })
        .then(rst => rst.data.result)
    },
    import(bucket, dbName, clName, file) {
      const params = { bucket, db: dbName, cl: clName }
      return tmsAxios
        .post(`${base}/uploadToImport`, file, { params })
        .then(rst => rst.data.result)
    },
    export(bucket, dbName, clName, param) {
      const params = { bucket, db: dbName, cl: clName }
      return tmsAxios
        .post(`${base}/export`, param, { params })
        .then(rst => rst.data.result)
    },
    upload(query, fileData, config) {
      let url = `${process.env.VUE_APP_BACK_API_BASE}/upload/plain`
      if (query && query.dir) url += `?dir=${query.dir}`
      return tmsAxios.post(url, fileData, config).then(rst => rst.data.result)
    }
  }
}
