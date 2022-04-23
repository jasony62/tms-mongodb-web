<template>
  <el-dialog ref="el" :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal">
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
      <el-button @click="dialogVisible2 = false">取消</el-button>
    </div>
  </el-dialog>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import apiBkt from '../apis/bucket'

const emit = defineEmits(['submit'])

const props = defineProps({
  dialogVisible: { default: true },
  bucket: {
    type: Object,
    default: function () {
      return { name: '', title: '', description: '' }
    },
  }
})

const el = ref(null as unknown as Element)
const { bucket, dialogVisible } = props
const dialogVisible2 = ref(dialogVisible)
const destroyOnClose = ref(true)
const closeOnClickModal = ref(false)

let mode = ''

const onSubmit = () => {
  if (mode === 'update') {
    apiBkt
      .update(bucket.name, bucket)
      .then((newBucket: any) => emit('submit', newBucket))
  } else if (mode === 'create') {
    apiBkt
      .create(bucket)
      .then((newBucket: any) => emit('submit', newBucket))
  }
}

// const open = (newMode, bucket) => {
//   mode = newMode
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
