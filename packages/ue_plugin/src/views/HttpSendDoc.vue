<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <div>
      <el-form label-position="top" size="large">
        <el-form-item label="数据接收地址">
          <el-input type="textarea" v-model="userInput.url" placeholder="请输入地址" autosize />
        </el-form-item>
        <el-form-item label="HTTP方法">
          <el-select v-model="userInput.method" placeholder="选择HTTP方法">
            <el-option label="get" value="get" />
            <el-option label="post" value="post" />
          </el-select>
        </el-form-item>
        <el-form-item label="清除发送的文档数据的id字段">
          <el-switch v-model="userInput.excludeId"></el-switch>
        </el-form-item>
      </el-form>
      <el-divider />
      <el-form>
        <el-form-item label="保存输入内容，下次继续使用">
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
import { onMounted, reactive, ref, toRaw } from 'vue';

const userInput = reactive({
  url: '',
  method: '',
  excludeId: true
})

const executed = ref(false)

const responseContent = ref<string>('')

const persistUserInput = ref(false)

enum PluginWidgetAction { Cancel = 'Cancel', Execute = 'Execute', Close = 'Close' }

interface PluginWidgetResult {
  action: PluginWidgetAction,
  result?: any,
  handleResponse?: boolean,
  applyAccessTokenField?: string // 定用户输入中申请添加access_token的字段
  reloadOnClose?: boolean // 关闭部件后是否要刷新数据 
}

// 调用插件的页面
const Caller = window.parent

// 根据发起方提供的基础参数生成代表调用方的key
const CallerKey = (() => {
  const params = location.search.match(/\bbucket=(.*)&db=(.+)&cl=(.+)\b/)
  if (params) {
    const [, bucketName, dbName, clName] = params
    return `bucket=${bucketName}&db=${dbName}&cl=${clName}`
  }
  return ''
})()

// 用于在本地存储中保存数据的key
const StorageKey = (() => {
  const LOCAL_STORAGE_KEY_LATEST_RESULT = 'http_send_doc_latest_result'
  return LOCAL_STORAGE_KEY_LATEST_RESULT + '.' + CallerKey
})()

/**接收结果*/
window.addEventListener('message', (event) => {
  const { data } = event
  const { response } = data
  if (response) {
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
      if (persistUserInput.value === true)
        localStorage.setItem(StorageKey, JSON.stringify({ userInput: toRaw(userInput), persistUserInput: true }))
      else
        localStorage.removeItem(StorageKey)
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

onMounted(() => {
  const latestResult = localStorage.getItem(StorageKey)
  if (latestResult) {
    let latest = JSON.parse(latestResult)
    if (latest.userInput) Object.assign(userInput, latest.userInput)
    if (latest.persistUserInput === true) persistUserInput.value = true
  }
})

</script>
