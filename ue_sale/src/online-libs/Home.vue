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
    clName: String,
    tmsAxiosName: String,
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
          bucketName: this.bucketName,
          dbName: this.dbName,
          clName: this.clName,
          tmsAxiosName: this.tmsAxiosName
        }
      }).$mount('#home')
    }
  }
}
</script>
