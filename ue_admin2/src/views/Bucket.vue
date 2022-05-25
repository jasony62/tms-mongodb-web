<template>
  <tms-frame class="tmw-bucket" :display="{ header: true, footer: true, right: true }" :leftWidth="'20%'">
    <template v-slot:header>
      <el-breadcrumb separator-class="el-icon-arrow-right">
        <el-breadcrumb-item :to="{ path: '/home' }">首页</el-breadcrumb-item>
      </el-breadcrumb>
    </template>
    <template v-slot:center>
      <el-table :data="store.buckets" stripe style="width: 100%">
        <el-table-column label="ID" width="180">
          <template #default="scope">
            <router-link :to="{ name: 'home', params: { bucketName: scope.row.name } }">{{ scope.row.name }}
            </router-link>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template #default="scope">
            <el-button @click="editBucket(scope.row, scope.$index)" type="text" size="mini">修改</el-button>
            <el-button @click="removeBucket(scope.row)" type="text" size="mini">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
    <template v-slot:right>
      <el-button @click="createBucket">新建</el-button>
    </template>
  </tms-frame>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

import facStore from '@/store'
import { openBucketEditor } from '@/components/editor'
import { ElMessage, ElMessageBox } from 'element-plus';
const store = facStore()
const props = defineProps(['bucket'])
const createBucket = (() => {
  openBucketEditor({
    mode: 'create',
    bucket: props.bucket,
    onBeforeClose: (newBucket?: any) => {
      if (newBucket)
        store.appendBucket({ bucket: newBucket })
    }
  })
})
const removeBucket = (bucket: any) => {
  ElMessageBox.confirm(
    `是否要删除【存储空间】?`,
    `请确认`,
    {
      confirmButtonText: '是',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      store.removeBucket({
        bucket: props.bucket,
      }).then(() => {
        ElMessage({ message: 'bucket已删除', type: 'success' })
      })
    }).catch(() => { })

}
const editBucket = (bucket: any, index: number) => {
  openBucketEditor({
    mode: 'update',
    bucket: props.bucket,
    onBeforeClose: (newBucket?: any) => {
      if (newBucket)
        store.updateBucket({ bucket: newBucket, index })
    }
  })

}

onMounted(() => {
  store.listBucket()
})
</script>
