<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <div>
      <el-form>
        <el-form-item>
          <el-button @click="onExecute('create')">启动任务</el-button>
          <el-button @click="onExecute('cancel')">停止任务</el-button>
        </el-form-item>
        <el-form-item>
          <el-button @click="onCancel" v-if="!executed">取消</el-button>
          <el-button @click="onClose" v-if="executed">关闭</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="response-content flex-grow border border-gray-200 rounded-md overflow-auto" v-if="responseContent">
      <pre>{{ responseContent }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const responseContent = ref<string>('')

const executed = ref(false)

enum PluginWidgetAction { Created = 'Created', Cancel = 'Cancel', Execute = 'Execute', Close = 'Close' }

interface PluginWidgetResult {
  action: PluginWidgetAction,
  result?: any,
  handleResponse?: boolean,
  applyAccessTokenField?: string // 定用户输入中申请添加access_token的字段
  reloadOnClose?: boolean // 关闭部件后是否要刷新数据 
}

// 调用插件的页面
const Caller = window.parent
const message: PluginWidgetResult = ({ action: PluginWidgetAction.Created })
Caller.postMessage(message, '*')

/**接收结果*/
window.addEventListener('message', (event) => {
  const { data } = event
  const { plugin, response } = data
  if (plugin && typeof plugin === 'object') {
    // 传入plugin实例
  } else if (response) {
    // 传入执行结果
    if (typeof response === 'string')
      responseContent.value = response
    else if (typeof response === 'object')
      responseContent.value = JSON.stringify(response, null, 2)
  }
})

function onExecute(action:string) {
    const message: PluginWidgetResult = { action: PluginWidgetAction.Execute, result: {action}, handleResponse: true }
    try {
      // 给调用方发送数据
      Caller.postMessage(message, '*')
      executed.value = true
    } catch (e) {
      console.log('未知错误', e)
    }
}

function onCancel() {
  if (Caller) {
    const message: PluginWidgetResult = ({ action: PluginWidgetAction.Cancel })
    Caller.postMessage(message, '*')
  }
}

function onClose() {
  if (Caller) {
    const message: PluginWidgetResult = ({ action: PluginWidgetAction.Close, reloadOnClose: true })
    Caller.postMessage(message, '*')
  }
}
</script>