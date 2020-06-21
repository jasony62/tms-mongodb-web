<template>
	<list-comp :bucket-name="bucketName" :db-name="dbName" :cl-name="clName" :tms-axio-name="'mongodb-api'"></list-comp>
</template>

<script>
import ListComp from './List.vue'

export default {
	name: 'Collection',
	props: {
		bucketName: String,
		dbName: String,
		clName: String
	},
	components: { ListComp }
}
</script>