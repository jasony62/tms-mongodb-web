<template>
  <div class="flex flex-row gap-2 h-full">
    <div class="w-36 flex-none h-full flex flex-col">
      <el-menu class="overflow-auto flex-none" default-active="/database/" router>
        <el-menu-item index="/database/">
          <span>数据库</span>
        </el-menu-item>
        <el-menu-item index="/docSchemas/">
          <span>文档内容定义</span>
        </el-menu-item>
        <el-menu-item index="/dbSchemas/">
          <span>数据库属性定义</span>
        </el-menu-item>
        <el-menu-item index="/clSchemas/">
          <span>集合属性定义</span>
        </el-menu-item>
        <el-menu-item index="/tag/">
          <span>标签</span>
        </el-menu-item>
        <el-menu-item index="/replica/">
          <span>全量复制定义</span>
        </el-menu-item>
        <el-menu-item index="/files/">
          <span>文件管理</span>
        </el-menu-item>
      </el-menu>
      <div class="flex-grow border-t border-r p-4 flex flex-col">
        <el-button type="primary" @click="openAssistant" v-if="!COMPACT">分屏</el-button>
        <el-button type="primary" @click="closeAssistant" v-if="COMPACT">关闭</el-button>
      </div>
    </div>
    <div class="flex-grow flex flex-col gap-2 mt-4 mx-4 h-full">
      <router-view></router-view>
    </div>
    <el-drawer v-model="assistant" size="75%" :with-header="false">
      <div class="h-full w-full relative">
        <iframe class="assistant" src="/admin/database/?compact=Y"></iframe>
      </div>
    </el-drawer>

  </div>
</template>
<style lang="scss">
.assistant {
  border: 0;
  @apply h-full w-full;
}
</style>
<script setup lang="ts">
import { COMPACT_MODE } from '@/global';
import { computed, ref } from 'vue';

const COMPACT = computed(() => COMPACT_MODE())

const assistant = ref(false)

const openAssistant = () => {
  assistant.value = true
}

window.addEventListener('message', (event: MessageEvent) => {
  const { data, origin } = event
  if (data?.action === 'close') {
    assistant.value = false
  }
})

const closeAssistant = () => {
  const Caller = window.parent
  Caller.postMessage({ action: 'close' }, '*')
}
</script>