<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <div>
      <el-form label-position="top" size="large">
        <el-form-item label="数据接收地址">
          <el-input type="textarea" v-model="userInput.url" placeholder="请输入地址" autosize :disabled="!enableInput.url" />
        </el-form-item>
        <el-form-item label="HTTP方法">
          <el-select v-model="userInput.method" placeholder="选择HTTP方法" :disabled="!enableInput.method">
            <el-option label="get" value="get" />
            <el-option label="post" value="post" />
          </el-select>
        </el-form-item>
        <el-form-item label="清除发送的文档数据的id字段">
          <el-switch v-model="userInput.excludeId" :disabled="!enableInput.excludeId"></el-switch>
        </el-form-item>
      </el-form>
      <el-divider />
      <el-form>
        <el-form-item label="保存输入内容，下次继续使用" v-if="RequireStore">
          <el-switch v-model="persistUserInput"></el-switch>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onExecute" :disabled="!userInput.url">执行</el-button>
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
import { reactive, ref, toRaw } from 'vue';

const userInput = reactive({
  url: '',
  method: 'post',
  excludeId: true
})

const enableInput = reactive({
  url: true,
  method: true,
  excludeId: true
})

const executed = ref(false)

const responseContent = ref<string>('')

const persistUserInput = ref(false)

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

// 根据发起方提供的基础参数生成代表调用方的key
const CallerKey = (() => {
  const params = location.search.match(/\bbucket=(.*)&db=(.+)&cl=(.+)\b/)
  if (params) {
    const [, bucketName, dbName, clName] = params
    return `bucket=${bucketName}&db=${dbName}&cl=${clName}`
  }
  return ''
})()

let PluginName: string = ''

// 用于在本地存储中保存数据的key
const StorageKey = (() => {
  return PluginName + '.' + CallerKey
})()

const RequireStore = ref(true)

/**接收结果*/
window.addEventListener('message', (event) => {
  const { data } = event
  const { plugin, response } = data
  if (plugin && typeof plugin === 'object') {
    const { ui } = plugin
    if (ui && typeof ui === 'object') {
      let { url, method, excludeId } = ui
      if (url?.value) {
        userInput.url = url.value
        enableInput.url = false
      }
      if (method?.value) {
        userInput.method = method.value
        enableInput.method = false
      }
      if (excludeId?.value) {
        userInput.excludeId = excludeId.value
        enableInput.excludeId = false
      }
      RequireStore.value = false
    } else {
      PluginName = plugin.name
      const latestInput = localStorage.getItem(StorageKey)
      if (latestInput) {
        let latest = JSON.parse(latestInput)
        if (latest.userInput) Object.assign(userInput, latest.userInput)
        if (latest.persistUserInput === true) persistUserInput.value = true
      }
      RequireStore.value = true
    }
  } else if (response) {
    if (typeof response === 'string')
      responseContent.value = response
    else if (typeof response === 'object')
      responseContent.value = JSON.stringify(response, null, 2)
  }
})

function onExecute() {
  if (Caller && userInput.url) {
    const message: PluginWidgetResult = { action: PluginWidgetAction.Execute, result: toRaw(userInput), handleResponse: true, applyAccessTokenField: 'url' }
    try {
      // 在本地存储中保存用户最近一次的输入
      if (RequireStore.value === true) {
        if (persistUserInput.value === true)
          localStorage.setItem(StorageKey, JSON.stringify({ userInput: toRaw(userInput), persistUserInput: true }))
        else
          localStorage.removeItem(StorageKey)
      }
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
