<template>
  <el-dialog title="分类目录" v-model="dialogVisible" :destroy-on-close="true" :close-on-click-modal="false"
    :before-close="onBeforeClose">
    <el-form ref="form" :model="dir" label-position="top">
      <el-form-item label="上级分类目录" v-if="parentDir">
        <el-button disabled type="primary" plain>{{ parentDir.full_title }}</el-button>
        <el-button disabled plain>{{ parentDir.full_name }}</el-button>
      </el-form-item>
      <el-form-item label="系统名（英文）">
        <el-input :disabled="mode === 'update'" v-model="dir.name"></el-input>
      </el-form-item>
      <el-form-item label="显示名（中文）">
        <el-input v-model="dir.title"></el-input>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="dir.description"></el-input>
      </el-form-item>
      <el-form-item label="顺序号">
        <el-input-number v-model="dir.order"></el-input-number>
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
import apiDir from '@/apis/dir'

const props = defineProps({
  mode: { type: String, default: '' },
  dialogVisible: { default: true },
  bucketName: { type: String },
  dbName: { type: String, default: '' },
  parentDir: { type: Object, default: null },
  dir: {
    type: Object,
    default: () => {
      return { name: '', title: '', description: '' }
    }
  },
  onClose: { type: Function, default: (newClDir: any) => { } }
})
const { mode, bucketName, dbName, parentDir, onClose } = props
const dialogVisible = ref(props.dialogVisible)
// 编辑的分类目录目录对象
const dir = reactive(props.dir)

const emit = defineEmits(['submit'])

const closeDialog = (newDir?: any) => {
  onClose(newDir)
}
// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog(null)
}

const onSubmit = () => {
  if (mode === 'update') {
    apiDir
      .update(bucketName, dbName, toRaw(dir))
      .then((newDir: any) => {
        emit('submit', newDir)
        closeDialog(newDir)
      })
  } else if (mode === 'create') {
    let newDir = toRaw(dir)
    if (props.parentDir) newDir.parentFullName = props.parentDir.full_name
    apiDir
      .create(bucketName, dbName, newDir)
      .then((newDir: any) => {
        emit('submit', newDir)
        closeDialog(newDir)
      })
  }
}
</script>