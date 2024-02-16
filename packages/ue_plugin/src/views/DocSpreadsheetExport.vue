<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <div>
      <el-form size="large" label-position="right">
        <el-form-item label="导出类型">
          <el-radio-group v-model="outType" class="ml-4">
            <el-radio label="excel" size="large">Excel</el-radio>
            <el-radio label="json" size="large">JSON</el-radio>
          </el-radio-group>
        </el-form-item>
        <div class="response-content flex-grow border border-gray-200 rounded-md overflow-auto" v-if="responseContent">
          <pre>{{ responseContent }}</pre>
        </div>
        <el-form-item>
          <el-button type="primary" @click="onExecute" :disabled="!outType">执行</el-button>
          <el-button @click="onCancel" v-if="!executed">取消</el-button>
          <el-button @click="onClose" v-if="executed">关闭</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const executed = ref(false)
const responseContent = ref<string>('')
const outType = ref<string>('excel')

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

interface Result {
  outType: string
}

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
      if (response.url) {
        window.open(response.url)
      } else {
        responseContent.value = JSON.stringify(response, null, 2)
      }
    }
  }
})

function onExecute() {
  let result: Result = {
    outType: outType.value,
  }
  if (Caller && outType.value) {
    const message: PluginWidgetResult = {
      action: PluginWidgetAction.Execute,
      result: result,
    }
    try {
      // 给调用方发送数据
      Caller.postMessage(message, '*')
      executed.value = true
    } catch (e) {
      console.log('未知错误', e)
    }
  }
}

function onCancel() {
  if (Caller) {
    const message: PluginWidgetResult = { action: PluginWidgetAction.Cancel }
    Caller.postMessage(message, '*')
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
