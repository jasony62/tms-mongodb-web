<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <div>
      <tms-json-doc v-if="loading === false" ref="$jde" :schema="obj.schema" :value="obj.data" :enable-paste="false"
        :hide-root-title="true" :hide-root-description="true"></tms-json-doc>
    </div>
    <div>
      <el-button type="primary" @click="onExecute">执行</el-button>
      <el-button @click="onCancel" v-if="!executed">取消</el-button>
      <el-button @click="onClose" v-if="executed">关闭</el-button>
    </div>
    <div class="response-content flex-grow border border-gray-200 rounded-md overflow-auto" v-if="responseContent">
      <pre>{{ responseContent }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import TmsJsonDoc, { DocAsArray } from 'tms-vue3-ui/dist/es/json-doc'
import 'tms-vue3-ui/dist/es/json-doc/style/tailwind.scss'

const $jde = ref<{ editing: () => any; editDoc: DocAsArray } | null>(null)
const obj = reactive({ schema: { type: 'object' }, data: {} })

const loading = ref(true)

const executed = ref(false)

const responseContent = ref<string>('')

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
  loading.value = false
  const { data } = event
  console.log('data -- ', data)
  if (data && data.schema) {
    obj.schema = data.schema
  }

  const { response } = data
  if (typeof response === 'string')
    responseContent.value = response
  else if (typeof response === 'object')
    responseContent.value = JSON.stringify(response, null, 2)
})

function onExecute() {
  let newDoc = $jde.value?.editing()
  if (Caller && Object.keys(newDoc).length !== 0) {
    const message: PluginWidgetResult = { action: PluginWidgetAction.Execute, result: newDoc, handleResponse: true, applyAccessTokenField: 'url' }
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
