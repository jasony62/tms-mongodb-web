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
            <el-button @click="invite(scope.row)" type="text" size="mini">邀请</el-button>
            <!-- <el-button @click="removeBucket(scope.row)" type="text" size="mini">接受邀请</el-button> -->
          </template>
        </el-table-column>
      </el-table>
      <el-dialog v-model="inviteVisible" title="邀请">
        <el-form :inline="true" :model="formInline" class="demo-form-inline">
          <el-form-item label="被邀请用户的昵称">
            <el-input v-model="formInline.user" placeholder="请输入用户昵称" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="postInvite">生成邀请信息</el-button>
          </el-form-item>
        </el-form>
        <h1 v-if="inviteVisible">
          <span id="copyContent"> 邀请链接：{{ inviteUrl }} 邀请码：{{ inviteCode }}</span>
          &nbsp<el-button type="primary" @click="copy">
            复制</el-button>
        </h1>
        <el-divider content-position="left">⬇️ 已加入用户 ⬇️</el-divider>

        <el-table :data="inviteData.data.coworkers">
          <el-table-column property="nickname" label="合作人" />
          <el-table-column property="accept_time" label="接受邀请时间" />
          <el-table-column label="操作">
            <template #default="scope">
              <el-button size="small" @click="removeCoworker(scope.row)">删除</el-button>
            </template>
          </el-table-column>

        </el-table>
      </el-dialog>
    </template>
    <template v-slot:right>
      <el-button @click="createBucket">新建</el-button>
    </template>
  </tms-frame>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';

import facStore from '@/store'
import { openBucketEditor } from '@/components/editor'
import { ElMessage, ElMessageBox } from 'element-plus'
//import type { Action } from 'element-plus'
import apiInvite from '@/apis/invite'
import apiBkt from '@/apis/bucket'
const store = facStore()
//const props = defineProps(['bucket'])
const inviteVisible = ref(false)
let inviteData = reactive({ data: { name: '', coworkers: [] } })
const formInline = reactive({ user: '' })
let inviteUrl = ref('')
let inviteCode = ref('')
const createBucket = (() => {
  openBucketEditor({
    mode: 'create',
    onBeforeClose: (newBucket?: any) => {
      if (newBucket)
        store.appendBucket({ bucket: newBucket.name })
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
        bucket: bucket,
      }).then((res: any) => {
        ElMessage({ message: 'bucket已删除', type: 'success' })
      }, (err: any) => {
        ElMessage({ message: err.msg || '删除失败', type: 'error' })
      })
    })

}
const editBucket = (bucket: any, index: number) => {
  openBucketEditor({
    mode: 'update',
    bucket: bucket,
    onBeforeClose: (newBucket?: any) => {
      if (newBucket)
        store.updateBucket({ bucket: newBucket, index })
    }
  })

}
const invite = (bucket: any) => {
  inviteData.data = bucket
  inviteVisible.value = true


}
const postInvite = () => {
  apiInvite.invite(inviteData.data.name, formInline.user).then((res: any) => {
    inviteUrl.value = window.location.origin + `/invite?bucket=${inviteData.data.name}`
    inviteCode.value = res
  })
}
const removeCoworker = (data: any) => {
  apiInvite.remove(inviteData.data.name, data.id).then((res: any) => {
    ElMessage({ message: res.msg || '删除成功', type: 'success' })
    inviteData.data.coworkers = inviteData.data.coworkers.filter((item: any) => {
      return item.id !== data.id
    })
  }, (err: any) => {
    // 如果用户没有授权，则抛出异常
    ElMessage({ message: err.msg || '删除失败', type: 'error' })
  })
}
const copy = () => {
  const el: HTMLElement | null = document.getElementById('copyContent')
  const str = el?.innerHTML || ''
  navigator.clipboard.writeText(str)
    .then(() => {
      ElMessage({ message: '文本已经成功复制到剪切板', type: 'success' })
    }, (err: any) => {
      // 如果用户没有授权，则抛出异常
      ElMessage({ message: `无法复制此文本：${err}`, type: 'error' })
    })
}

onMounted(() => {
  store.listBucket()
})
</script>
