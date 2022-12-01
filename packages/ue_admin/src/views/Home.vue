<template>
  <div class="flex flex-row gap-2 h-full">
    <div class="w-36 flex-none h-full flex flex-col">
      <el-menu v-if="EXTRACT !== true" class="overflow-auto flex-none" default-active="/database/" router>
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
      <div class="flex-grow border-t border-r p-4 flex flex-col gap-2">
        <div>
          <el-button class="w-full" type="primary" @click="openAssistant" v-if="!COMPACT">分屏</el-button>
        </div>
        <div>
          <el-button class="w-full" @click="closeAssistant" v-if="COMPACT">关闭</el-button>
        </div>
        <div>
          <el-button class="w-full" type="primary" @click="confirmAssistant" v-if="EXTRACT">确认</el-button>
        </div>
      </div>
    </div>
    <div class="flex-grow flex flex-col gap-2 mt-4 mx-4 h-full">
      <router-view></router-view>
    </div>
    <assistant></assistant>
  </div>
</template>
<script setup lang="ts">
import { COMPACT_MODE, EXTRACT_MODE } from '@/global'
import { computed } from 'vue';
import Assistant from '@/components/Assistant.vue'
import { useAssistant } from '@/composables/assistant';
import { useMitt } from '@/composables/mitt';

const COMPACT = computed(() => COMPACT_MODE())
const EXTRACT = computed(() => EXTRACT_MODE())

const { opened } = useAssistant()

const openAssistant = () => {
  opened.value = true
}

window.addEventListener('message', (event: MessageEvent) => {
  const { data, origin } = event
  if (data?.action === 'close') {
    opened.value = false
  }
})

const closeAssistant = () => {
  const Caller = window.parent
  Caller.postMessage({ action: 'close' }, '*')
}

const confirmAssistant = () => {
  const extractResult = (docIds: any) => {
    const Caller = window.parent
    if (Caller)
      Caller.postMessage({ action: 'extract.close', docIds }, '*')
    emitter.off('extract.confirm.result', extractResult)
  }
  const emitter = useMitt()
  emitter.on('extract.confirm.result', extractResult)
  emitter.emit('extract.confirm')
}
</script>