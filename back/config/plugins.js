module.exports = {
  document: {
    submits: [
      {
        id: "syncToPool",
        name: "同步订单至号池",
        batch: ["all", "filter", "ids"]
      },
      {
        id: "syncToWork",
        name: "同步订单至业务层",
        batch: ["all", "filter", "ids"]
      }
    ]
	},
	httpApiUrl: {
    syncToPool: {
      syncOrder: process.env.TMS_HTTP_SYNCTOPOOL_URL
    },
    syncToWork: {
			syncOrder: process.env.TMS_HTTP_SYNCTOWORK_URL
		}
  }
}
