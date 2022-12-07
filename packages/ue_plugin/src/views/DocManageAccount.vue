<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <el-form :inline="true">
      <el-form-item>
        <el-button v-if="!executed" @click="onCancel">取消</el-button>
        <el-button v-if="executed" @click="onClose">关闭</el-button>
      </el-form-item>
    </el-form>
    <div v-if="document.forbidden == true">当前账号已注销</div>
    <div v-else>
      <tms-json-doc v-if="loading === false" ref="$jde" :schema="schema" :value="document" :enable-paste="false"
        :hide-root-title="true" :hide-root-description="true"></tms-json-doc>
      <div class="mt-2">
        <el-button type="primary" @click="onSubmit">修改密码</el-button>
        <el-button type="danger" @click="onLogoff">注销账户</el-button>
      </div>
    </div>
    <div class="response-content flex-grow border border-gray-200 rounded-md overflow-auto" v-if="responseContent">
      <pre>{{ responseContent }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRaw } from 'vue';
import TmsJsonDoc, { DocAsArray } from 'tms-vue3-ui/dist/es/json-doc'
import 'tms-vue3-ui/dist/es/json-doc/style/tailwind.scss'

const $jde = ref<{ editing: () => any; editDoc: DocAsArray } | null>(null)

const schema = ref<any>({})

const document = ref<any>({})

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
  // 处理数据
  if (data && data.document) {
    Object.entries(data.schema.properties).forEach(([key, value]: [string, any]) => {
      value.readonly = true
      if (value.type === 'string' && value.format === 'password') {
        value.readonly = false
      }
    });
    schema.value = data.schema
    document.value = data.document
  }

  const { response } = data
  if (typeof response === 'string') {
    document.value.forbidden = true
    responseContent.value = response
  } else if (typeof response === 'object')
    responseContent.value = JSON.stringify(response, null, 2)
})

function onSubmit() {
  let newDoc = $jde.value?.editing()
  document.value = newDoc
  onExecute(newDoc)
}

function onLogoff() {
  let newDoc = $jde.value?.editing()
  newDoc.forbidden = true
  onExecute(toRaw(newDoc))
}

function onExecute(result: any) {
  if (Caller) {
    const message: PluginWidgetResult = { action: PluginWidgetAction.Execute, result: { userInfo: result }, handleResponse: true, applyAccessTokenField: 'url' }
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
