const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/tag'

export default function create(tmsAxios) {
	return {
		list(bucket) {
			const params = { bucket }
			return tmsAxios
				.get(`${base}/list`, { params })
				.then(rst => rst.data.result)
		}
	}
}
