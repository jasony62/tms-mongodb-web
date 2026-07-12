<template>
  <el-drawer v-model="opened" size="75%" :with-header="false" :destroy-on-close="true">
    <div class="h-full w-full relative">
      <iframe class="assistant" :src="url"></iframe>
    </div>
  </el-drawer>
</template>
<script setup lang="ts">
import { useAssistant } from '@/composables/assistant'

const { opened, url } = useAssistant()

</script>
