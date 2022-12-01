<template>
  <div v-if="externalFsUrl" class="flex flex-col gap-2 h-full">
    <iframe id="iframe" width="100%" height="100%" frameborder="0" :src="externalFsUrl" marginwidth="0" marginheight="0"
      scrolling="no"></iframe>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { EXTERNAL_FS_URL, getLocalToken } from '@/global'

// 文件服务地址
const externalFsUrl = computed(() => {
  let fsUrl = EXTERNAL_FS_URL()
  if (fsUrl) {
    fsUrl += fsUrl.indexOf('?') === -1 ? '?' : '&'
    fsUrl += `access_token=${getLocalToken()}`
    fsUrl += '&pickFile=no'
  }
  return fsUrl
})

const props = defineProps({ bucketName: String })

onMounted(() => {
  let bucket = props.bucketName
})
</script>
