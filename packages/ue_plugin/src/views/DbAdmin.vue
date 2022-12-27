<template>
  <div id="database-admin">
    <div class="flex flex-col gap-4 h-full w-full">
      <div>
        <el-button @click="onCancel" v-if="!executed">取消</el-button>
        <el-button @click="onClose" v-if="executed">关闭</el-button>
      </div>
      <el-tabs type="border-card">
        <el-tab-pane label="profile">
          <el-form label-position="top" size="large">
            <el-form-item label="数据库中的值">
              <div class="px-2 border-gray-200 rounded-md">
                <pre>{{ currentProfiling }}</pre>
              </div>
            </el-form-item>
            <el-form-item label="开关">
              <el-select v-model="userInput.level" placeholder="开关">
                <el-option label="关闭" value=0 />
                <el-option label="记录超出阈值的操作" value=1 />
                <el-option label="记录全部操作" value=2 />
              </el-select>
            </el-form-item>
            <el-form-item label="慢查询阈值（毫秒）">
              <el-input type="number" v-model="userInput.slowms" placeholder="慢查询阈值（毫秒）" />
            </el-form-item>
            <el-form-item label="采样比例">
              <el-input type="number" v-model="userInput.sampleRate" placeholder="采样比例" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="onExecute('setProfiling')">设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="command">
          <el-form label-position="top" size="large">
            <el-form-item label="数据库命令">
              <el-input type="textarea" v-model="command" rows="4" placeholder="数据库命令" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="onExecute('runCommand')">执行</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <div class="response-content flex-grow border border-gray-200 rounded-md overflow-auto" v-if="responseContent">
        <pre>{{ responseContent }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
#database-admin {
  @apply flex flex-col gap-4 h-full w-full;

  .el-tabs {
    @apply flex-grow flex flex-col gap-4 w-full;
  }

  .response-content {
    @apply flex-grow border border-gray-200 rounded-md overflow-auto p-2;
  }
}
</style>


<script setup lang="ts">
import { reactive, ref, toRaw } from 'vue'
import { ElMessage } from 'element-plus'

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


const userInput = reactive({
  level: '1',
  slowms: 100,
  sampleRate: 1.0
})

const command = ref('')

const currentDatabase = ref(null)

const currentProfiling = ref('')

/**接收结果*/
window.addEventListener('message', (event) => {
  const { data } = event
  const { plugin, database, response } = data
  if (plugin && typeof plugin === 'object') {
    // 传入plugin实例
    currentDatabase.value = database
    // 获取数据库的profiling
    onExecute('getProfiling')
  } else if (response) {
    // 传入执行结果
    if (typeof response === 'string')
      responseContent.value = response
    else if (typeof response === 'object') {
      const { profiling, setProfiling } = response
      if (profiling && typeof profiling === 'object') {
        const { was, slowms, sampleRate } = profiling
        userInput.level = profiling.was
        userInput.slowms = profiling.slowms
        userInput.sampleRate = profiling.sampleRate
        currentProfiling.value = JSON.stringify({ was, slowms, sampleRate })
      } else if (setProfiling === true) {
        let was = userInput.level
        let slowms = userInput.slowms
        let sampleRate = userInput.sampleRate
        currentProfiling.value = JSON.stringify({ was, slowms, sampleRate })
      } else {
        responseContent.value = JSON.stringify(response, null, 2)
      }
    }
  }
})

function onExecute(action: string) {
  if (!Caller)
    return

  let message: PluginWidgetResult | null = null
  switch (action) {
    case 'getProfiling':
      message = { action: PluginWidgetAction.Execute, result: { action }, handleResponse: true }
      break
    case 'setProfiling':
      message = { action: PluginWidgetAction.Execute, result: { action, params: toRaw(userInput) }, handleResponse: true }
      break
    case 'runCommand':
      try {
        let params = JSON.parse(command.value)
        message = { action: PluginWidgetAction.Execute, result: { action, params }, handleResponse: true }
      } catch (e: any) {
        ElMessage({ message: '数据格式错误：' + e.message, type: 'error' })
        return
      }
      break
  }

  if (message) {
    // 给调用方发送数据
    Caller.postMessage(message, '*')
    executed.value = true
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