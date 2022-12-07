<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <div class="w-full flex-grow">
      <div ref="elJsonEditor" class="w-full h-full"></div>
    </div>
    <div class="flex-none">
      <el-form>
        <el-form-item>
          <el-button @click="onExecute()">导入</el-button>
          <el-button @click="onCancel" v-if="!executed">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>
<style lang="scss">
html,
body,
#app {
  @apply h-full;
}

.jsoneditor {

  .jsoneditor-transform,
  .jsoneditor-poweredBy {
    display: none;
  }
}
</style>
<script setup lang="ts">
import JSONEditor from 'jsoneditor'
import 'jsoneditor/dist/jsoneditor.css'
import { onMounted, ref } from 'vue';

const elJsonEditor = ref<HTMLElement | null>(null)

let jsonEditor: any = null

const options = {
  mode: 'code',
  search: false,
}

onMounted(() => {
  if (elJsonEditor.value)
    //@ts-ignore
    jsonEditor = new JSONEditor(elJsonEditor.value, options)
})

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
  const { response } = data
})

function onExecute() {
  if (Caller) {
    let newDoc = jsonEditor.get()
    const message: PluginWidgetResult = { action: PluginWidgetAction.Execute, result: newDoc }
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

</script>
