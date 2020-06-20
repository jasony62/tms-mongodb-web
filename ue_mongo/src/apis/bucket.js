const base = (process.env.VUE_APP_BACK_API_BASE || '') + '/mongo/bucket'

export default function create(tmsAxios){
	return {
		/**
		 * 返回当前用户可用的bucket
		 */
		list() {
			return tmsAxios
				.get(`${base}/list`)
				.then(rst => rst.data.result)
		}
	}
}
