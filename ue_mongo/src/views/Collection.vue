<template>
  <tms-frame :display="{ header: true, footer: false, right: false, left: false }">
    <template v-slot:header>
      <el-breadcrumb separator-class="el-icon-arrow-right">
        <el-breadcrumb-item :to="{ name: 'home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'database', params: { dbName: dbName } }">{{ dbName }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{ clName }}</el-breadcrumb-item>
      </el-breadcrumb>
    </template>
    <template v-slot:center>
      <div id="collection"></div>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { Frame } from 'tms-vue-ui'
Vue.use(Frame)
import { Breadcrumb, BreadcrumbItem } from 'element-ui'
Vue.use(Breadcrumb).use(BreadcrumbItem)

export default {
  name: 'Collection',
  props: {
    bucketName: String,
    dbName: String,
    clName: String
  },
  mounted() {
    import('../../../ue_comp/src/List.vue.js').then(Module => {
      Module.createAndMount(
        Vue,
        {
          bucketName: this.bucketName,
          dbName: this.dbName,
          clName: this.clName,
          tmsAxiosName: 'mongodb-api'
        },
        'collection'
      )
    })
  }
}
</script>
