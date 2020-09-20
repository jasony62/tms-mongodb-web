import { TmsAxios } from 'tms-vue'

const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/admin/tag'

export default {
	list(bucket) {
		const params = { bucket }
		return TmsAxios.ins('mongodb-api')
			.get(`${base}/list`, { params })
			.then(rst => rst.data.result)
	}
}
