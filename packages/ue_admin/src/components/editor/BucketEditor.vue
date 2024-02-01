<template>
  <el-dialog ref="el" v-model="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal"
    :before-close="onBeforeClose">
    <el-form ref="form" :model="bucket" label-position="top">
      <el-form-item label="ID（英文字符）">
        <el-input v-model="bucket.name"></el-input>
      </el-form-item>
      <el-form-item label="存储空间显示名">
        <el-input v-model="bucket.title"></el-input>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="bucket.description"></el-input>
      </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onBeforeClose">取消</el-button>
    </div>
  </el-dialog>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue'
import apiBkt from '@/apis/bucket'
import { ElMessage } from 'element-plus'

const props = defineProps({
  dialogVisible: { default: true },
  mode: { type: String, default: '' },
  bucket: {
    type: Object,
    default: function () {
      return { name: '', title: '', description: '' }
    },
  },
  onClose: { type: Function, default: (newDb: any) => { } }

})
const el = ref(null as unknown as Element)
const { mode, onClose } = props
const dialogVisible = ref(props.dialogVisible)
const bucket = reactive(props.bucket)
const destroyOnClose = ref(true)
const closeOnClickModal = ref(false)
const onSubmit = () => {
  if (mode === 'update') {
    apiBkt
      .update(bucket.name, bucket)
      .then((newBucket: any) => {
        ElMessage({ message: '更新成功', type: 'success' })
        closeDialog(newBucket)
      }, (err: any) => {
        ElMessage({ message: err.msg || '失败', type: 'error' })
      })
  } else if (mode === 'create') {
    apiBkt
      .create(bucket)
      .then((newBucket: any) => {
        ElMessage({ message: '创建成功', type: 'success' })
        closeDialog(newBucket)
      }, (err: any) => {
        ElMessage({ message: err.msg || '失败', type: 'error' })
      })
  }
}
// 关闭对话框时执行指定的回调方法
const closeDialog = (newDb?: any) => {
  onClose(newDb)
}

// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog(null)
}
// const open = (newMode: string, bucket: any) => {
//   mode.value = newMode
//   if (mode === 'update') Object.assign(this.bucket, bucket)
//   this.$mount()
//   document.body.appendChild(el.value)
//   return new Promise((resolve) => {
//     this.$on('submit', (newBucket) => {
//       dialogVisible2.value = false
//       resolve(newBucket)
//     })
//   })
// }
</script>
