<template>
  <div id="home">
		<p>dddd</p>
	</div>
</template>

<script>
import Vue from 'vue'

import { tmsImportLib } from 'tms-vue'

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
			const name = 'Portal'
      const compOptions = await tmsImportLib(libUrl, { name })
      const CompClass = Vue.extend(compOptions)
      const comp = new CompClass({
        propsData: {
					tmsAxiosName: 'mongodb-api',
					bucketName: this.bucketName,
					dbName: 'test2',
					clName: 'testJH'
        }
      })
      comp.$mount()
    }
  }
}
</script>
