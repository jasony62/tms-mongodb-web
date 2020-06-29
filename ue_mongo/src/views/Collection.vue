<template>
  <div id="collection"></div>
</template>

<script>
import Vue from 'vue'

export default {
  name: 'Collection',
  props: {
    bucketName: String,
    dbName: String,
    clName: String
  },
  mounted() {
    import('../components/List.vue').then(Module => {
      Module.createAndMount(Vue, {
        bucketName: this.bucketName,
        dbName: this.dbName,
        clName: this.clName,
        tmsAxiosName: 'mongodb-api'
      }, 'collection')
    })
  }
}
</script>