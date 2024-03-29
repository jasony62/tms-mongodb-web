<template>
  <div class="h-full flex flex-col">
    <!--header-->
    <div class="px-2 py-1 text-right border-b">
      <el-dropdown>
        <el-button circle :icon="Avatar"></el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item>{{ ClientName }}</el-dropdown-item>
            <el-dropdown-item divided @click="logout">退出</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <!--content-->
    <div class="flex-grow flex flex-row gap-2 overflow-y-auto">
      <div class="w-36 flex-none h-full flex flex-col">
        <!--left-->
        <el-menu v-if="EXTRACT !== true" class="overflow-auto flex-none" default-active="/database/" router>
          <el-menu-item index="/database/">
            <span>{{ DbLabel }}</span>
          </el-menu-item>
          <el-sub-menu index="globalSchema">

            <template #title>字段定义</template>
            <el-menu-item index="/docSchemas/">
              <span>文档</span>
            </el-menu-item>
            <el-menu-item index="/dbSchemas/">
              <span>{{ DbLabel }}</span>
            </el-menu-item>
            <el-menu-item index="/clSchemas/">
              <span>集合</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item index="/tag/" v-if="false">
            <span>标签</span>
          </el-menu-item>
          <el-menu-item index="/files/" v-if="EXTERNALFSURL">
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
      <!--content-->
      <div class="flex-grow flex flex-col gap-2 h-full overflow-x-auto">
        <router-view :key="route.path"></router-view>
      </div>
      <assistant></assistant>
    </div>
  </div>
</template>

<script setup lang="ts">
import { COMPACT_MODE, EXTRACT_MODE, EXTERNAL_FS_URL, LABEL, LOGIN_USERNAME_JSONPOINTER } from '@/global'
import { computed } from 'vue'
import Assistant from '@/components/Assistant.vue'
import { useAssistant } from '@/composables/assistant'
import { useMitt } from '@/composables/mitt'
import { useRouter, useRoute } from 'vue-router'
import { Avatar } from '@element-plus/icons-vue'
import * as jsonpointer from 'jsonpointer'
import facStore from '@/store'

const router = useRouter()
const route = useRoute()
/**
 * 获取当前用户的信息
 */
const { clientInfo } = facStore()
const ClientName = computed(() => {
  const jp = LOGIN_USERNAME_JSONPOINTER()
  const name = jsonpointer.get(clientInfo, jp)
  return name
})
const COMPACT = computed(() => COMPACT_MODE())
const EXTRACT = computed(() => EXTRACT_MODE())
const EXTERNALFSURL = computed(() => EXTERNAL_FS_URL())
const DbLabel = computed(() => LABEL('database', '数据库'))

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
  const extractResult = (result: any) => {
    const Caller = window.parent
    Caller?.postMessage({ action: 'extract.close', result }, '*')
    emitter.off('extract.confirm.result', extractResult)
  }
  const emitter = useMitt()
  emitter.on('extract.confirm.result', extractResult)
  emitter.emit('extract.confirm')
}

const logout = () => {
  router.push({ name: 'logout' })
}
</script>