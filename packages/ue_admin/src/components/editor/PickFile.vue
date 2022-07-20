<template>
  <el-dialog title="选取文件" v-model="innerVisible" :fullscreen="true" :destroy-on-close="true"
    :close-on-click-modal="true" :before-close="onBeforeClose">
    <iframe id="iframe" width="100%" height="100%" frameborder="0" :src="url" marginwidth="0" marginheight="0"
      scrolling="no" @load="iframeLoad"></iframe>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, nextTick } from 'vue'
import { parseLocation } from '@/global'

const props = defineProps({
  innerVisible: { default: true },
  url: { type: String, required: true },
  onClose: { type: Function, default: (newDoc: any) => { } },
})

const { onClose } = props
// 关闭对话框时执行指定的回调方法
const closeDialog = (newDoc?: any) => {
  onClose(newDoc)
}

// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog(null)
}

const iframeLoad = () => {
  let ifm: any = document.getElementById('iframe')
  ifm.height = document.documentElement.clientHeight
}

onMounted(() => {
  nextTick(() => {
    window.addEventListener(
      'message',
      (e: any) => {
        const origin = e.origin || e.originalEvent.origin
        const locationObj = parseLocation(props.url)
        if (origin === locationObj.origin) {
          closeDialog(e.data)
        }
      },
      false
    )
  })
})
</script>
