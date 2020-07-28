module.exports = {
	document: {
		submits: [
			{
				id: "removeMany",
				name: "批量删除",
				batch: ["all", "filter", "ids"]
			},
			{
				id: "move",
				name: "数据迁移",
				batch: ["all", "filter", "ids"]
			}
		]
	}
}
