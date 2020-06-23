<template>
  <div id="home"></div>
</template>

<script>
import Vue from 'vue'
import { Frame, Flex } from 'tms-vue-ui'
import { tmsImportLib } from 'tms-vue'

Vue.use(Frame).use(Flex)

export default {
	name: 'home',
	props: {
		bucketName: String,
		dbName: String,
		clName: String
	},
	mounted() {
		this.load()
	},
  methods: {
    async load() {
			const libUrl = process.env.VUE_APP_LIB_URL
			const name = 'List'
			const compOptions = await tmsImportLib(libUrl, { name })
			const CompClass = Vue.extend(compOptions)
		
      new CompClass({
        propsData: {
					tmsAxiosName: 'mongodb-api',
					bucketName: this.bucketName,
					dbName: 'test2',
					clName: 'testSyncPool'
        }
      }).$mount('#home')
    }
  }
}
</script>
