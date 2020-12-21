const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/replica'

export default function create(tmsAxios) {
  return {
    list(bucket, proto) {
      const params = { bucket }
      return tmsAxios
        .post(`${base}/list`, proto, { params })
        .then(rst => rst.data.result)
    },
    create(bucket, proto) {
      const params = { bucket }
      return tmsAxios
        .post(`${base}/create`, proto, { params })
        .then(rst => rst.data.result)
    },
    remove(bucket, proto) {
      const params = { bucket }
      return tmsAxios
        .post(`${base}/remove`, proto, { params })
        .then(rst => rst.data.result)
    },
    synchronize(bucket, proto) {
      const params = { bucket }
      return tmsAxios
        .post(`${base}/synchronize`, proto, { params })
        .then(rst => rst.data.result)
    }
  }
}
