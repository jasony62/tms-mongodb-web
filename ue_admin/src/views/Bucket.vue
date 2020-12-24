<template>
  <tms-frame class="tmw-bucket" :display="{ header: true, footer: true, right: true }" :leftWidth="'20%'">
    <template v-slot:header>
      <el-breadcrumb separator-class="el-icon-arrow-right">
        <el-breadcrumb-item :to="{ path: '/home' }">首页</el-breadcrumb-item>
      </el-breadcrumb>
    </template>
    <template v-slot:center>
      <el-table :data="buckets" stripe style="width: 100%">
        <el-table-column label="ID" width="180">
          <template slot-scope="scope">
            <router-link :to="{name: 'home', params: { bucketName: scope.row.name }}">{{ scope.row.name }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template slot-scope="scope">
            <el-button @click="editBucket(scope.row, scope.$index)" type="text" size="mini">修改</el-button>
            <el-button @click="handleBucket(scope.row)" type="text" size="mini">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
    <template v-slot:right>
      <el-button @click="createBucket">新建</el-button>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { mapState, mapMutations, mapActions } from 'vuex'
import { Frame, Flex } from 'tms-vue-ui'
Vue.use(Frame).use(Flex)
import BucketEditor from '../components/BucketEditor.vue'

export default {
  name: 'Bucket',
  computed: {
    ...mapState(['buckets'])
  },
  data() {
    return {}
  },
  methods: {
    ...mapMutations(['appendBucket', 'updateBucket']),
    ...mapActions(['listBucket', 'removeBucket']),
    createBucket() {
      let editor = new Vue(BucketEditor)
      editor.open('create').then(bucket => {
        this.appendBucket({ bucket })
      })
    },
    editBucket(bucket, index) {
      let editor = new Vue(BucketEditor)
      editor
        .open('update', {
          ...bucket
        })
        .then(newBucket => {
          this.updateBucket({ bucket: newBucket, index })
        })
    },
    handleBucket(bucket) {
      this.$customeConfirm('【存储空间】', () => {
        return this.removeBucket({ bucket })
      })
    }
  },
  mounted() {
    this.listBucket()
  }
}
</script>
