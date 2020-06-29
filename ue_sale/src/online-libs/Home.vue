<template>
  <div id="home"></div>
</template>

<script>
import Vue from 'vue'

export default {
  name: 'home',
  props: {
    bucketName: String,
    dbName: String,
    clName: String,
    tmsAxiosName: String,
  },
  mounted() {
    import('../../../ue_comp/src/List.vue').then(Module => {
      Module.createAndMount(Vue, {
        bucketName: this.bucketName,
        dbName: this.dbName,
        clName: this.clName,
        tmsAxiosName: this.tmsAxiosName
      }, 'home')
    })
  }
}
</script>
