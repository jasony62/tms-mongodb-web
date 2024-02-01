<template>
  <el-dialog title="集合分类" v-model="dialogVisible" :destroy-on-close="true" :close-on-click-modal="false"
    :before-close="onBeforeClose">
    <el-form ref="form" :model="collectionDir" label-position="top">
      <el-form-item label="上级系统名" v-if="parentFullName">
        <div>{{ parentFullName }}</div>
      </el-form-item>
      <el-form-item label="系统名（英文）">
        <el-input v-model="collectionDir.name"></el-input>
      </el-form-item>
      <el-form-item label="显示名（中文）">
        <el-input v-model="collectionDir.title"></el-input>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="collectionDir.description"></el-input>
      </el-form-item>
      <el-form-item label="顺序号">
        <el-input-number v-model="collectionDir.order"></el-input-number>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onBeforeClose">取消</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { reactive, ref, toRaw } from 'vue'
import apiClDir from '@/apis/cldir'

const props = defineProps({
  mode: { type: String, default: '' },
  dialogVisible: { default: true },
  bucketName: { type: String },
  dbName: { type: String, default: '' },
  parentFullName: { type: String, default: '' },
  collectionDir: {
    type: Object,
    default: () => {
      return { name: '', title: '', description: '' }
    }
  },
  onClose: { type: Function, default: (newClDir: any) => { } }
})
const { mode, bucketName, dbName, parentFullName, onClose } = props
const dialogVisible = ref(props.dialogVisible)
// 编辑的集合分类目录对象
const collectionDir = reactive(props.collectionDir)

const emit = defineEmits(['submit'])

const closeDialog = (newClDir?: any) => {
  onClose(newClDir)
}
// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog(null)
}

const onSubmit = () => {
  if (mode === 'update') {
    apiClDir
      .update(bucketName, dbName, toRaw(collectionDir))
      .then((newClDir: any) => {
        emit('submit', newClDir)
        closeDialog(newClDir)
      })
  } else if (mode === 'create') {
    let newClDir = toRaw(collectionDir)
    if (parentFullName) newClDir.parentFullName = parentFullName
    apiClDir
      .create(bucketName, dbName, toRaw(collectionDir))
      .then((newClDir: any) => {
        emit('submit', newClDir)
        closeDialog(newClDir)
      })
  }
}
</script>