<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <div>
      <el-form size="large" label-position="top">
        <el-form-item>
          <el-button @click="onCreateCommit">保存新版本</el-button>
          <el-button @click="onListCommit">列出已有版本</el-button>
          <el-button @click="onClose">关闭</el-button>
        </el-form-item>
        <el-form-item label="指定保存的字段">
          <el-input v-model="userConfig.field" placeholder="请输入字段名称" />
        </el-form-item>
        <el-form-item label="指定版本文件扩展名">
          <el-input v-model="userConfig.extensionName" placeholder="请输入版本文件扩展名" />
        </el-form-item>
      </el-form>
      <div class="response-content flex-grow border border-gray-200 rounded-md overflow-auto" v-if="responseContent">
        <pre>{{ responseContent }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, toRaw } from 'vue'

const responseContent = ref<string>('')

enum PluginWidgetAction {
  Created = 'Created',
  Cancel = 'Cancel',
  Execute = 'Execute',
  Close = 'Close',
}

interface PluginWidgetResult {
  action: PluginWidgetAction
  result?: any
  handleResponse?: boolean
  applyAccessTokenField?: string // 定用户输入中申请添加access_token的字段
  reloadOnClose?: boolean // 关闭部件后是否要刷新数据
}

const userConfig = reactive({
  field: '',
  extensionName: 'json'
})

// 调用插件的页面
const Caller = window.parent
const message: PluginWidgetResult = { action: PluginWidgetAction.Created }
Caller.postMessage(message, '*')

/**接收结果*/
window.addEventListener('message', (event) => {
  const { data } = event
  const { response } = data
  if (response) {
    if (typeof response === 'string') {
      responseContent.value = response
    } else if (typeof response === 'object') {
      if (response.filePath) {
        window.open(response.filePath)
      } else {
        responseContent.value = JSON.stringify(response, null, 2)
      }
    }
  }
})

function onCreateCommit() {
  if (Caller) {
    const message: PluginWidgetResult = {
      action: PluginWidgetAction.Execute,
      result: { action: 'commit', userConfig: toRaw(userConfig) },
      handleResponse: true
    }
    try {
      // 给调用方发送数据
      Caller.postMessage(message, '*')
    } catch (e) {
      console.log('未知错误', e)
    }
  }
}

function onListCommit() {
  if (Caller) {
    const message: PluginWidgetResult = {
      action: PluginWidgetAction.Execute,
      result: { action: 'list', userConfig: toRaw(userConfig) },
      handleResponse: true
    }
    try {
      // 给调用方发送数据
      Caller.postMessage(message, '*')
    } catch (e) {
      console.log('未知错误', e)
    }
  }
}

function onClose() {
  if (Caller) {
    const message: PluginWidgetResult = {
      action: PluginWidgetAction.Close,
      reloadOnClose: true,
    }
    Caller.postMessage(message, '*')
  }
}
</script>
