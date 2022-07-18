<template>
  <el-dialog title="标签" v-model="dialogVisible" :destroy-on-close="true" :close-on-click-modal="false"
    :before-close="onBeforeClose">
    <el-form ref="form" :model="tag" label-position="top">
      <el-form-item label="标签名">
        <el-input v-model="tag.name"></el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onBeforeClose">取消</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { reactive, ref } from 'vue';
import apiTag from '@/apis/tag'

const emit = defineEmits(['submit'])

const props = defineProps({
  mode: { type: String, default: '' },
  dialogVisible: { default: true },
  bucketName: { type: String },
  tag: {
    type: Object,
    default: () => {
      return { name: '' }
    }
  },
  onClose: { type: Function, default: (newTag: any) => { } }
})

const { mode, bucketName, onClose } = props

const dialogVisible = ref(props.dialogVisible)
const tag = reactive(props.tag)

// 关闭对话框时执行指定的回调方法
const closeDialog = (newTag?: any) => {
  onClose(newTag)
}

// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog(null)
}

const onSubmit = () => {
  if (mode === 'update') {
    apiTag
      .update(bucketName, tag)
      .then((newTag: any) => {
        emit('submit', newTag)
        closeDialog(newTag)
      })
  } else if (mode === 'create') {
    apiTag
      .create(bucketName, tag)
      .then((newTag: any) => {
        emit('submit', newTag)
        closeDialog(newTag)
      })
  }
}
</script>
