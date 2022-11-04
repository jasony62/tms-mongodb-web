<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <div>
      <el-form :inline="true">
        <el-form-item>
          <el-button @click="onCancel" v-if="!executed">取消</el-button>
          <el-button @click="onClose" v-if="executed">关闭</el-button>
        </el-form-item>
      </el-form>
      <el-tabs v-model="activeName" @tab-click="onClickTab" v-if="!userInput.forbidden">
        <el-tab-pane label="修改密码" name="first">
          <el-form label-width="120px" label-position="left">
            <el-form-item label="用户名">
              <el-input v-model="userInput.username" disabled></el-input>
            </el-form-item>
            <el-form-item label="修改密码">
              <el-input type="password" v-model="userInput.password" placeholder="8-20位大小写数字特殊字符组合" show-password />
            </el-form-item>
          </el-form>
          <el-button type="primary" @click="onSubmit" :disabled="!userInput.password">确认</el-button>
        </el-tab-pane>
        <el-tab-pane label="账号注销" name="second">
          <p class="tracking-wider mb-8">账号注销后，用户将无法登录、使用{{ userInput.username }}账号。</p>
          <el-button type="danger" @click="onLogoff">注销</el-button>
        </el-tab-pane>
      </el-tabs>
    </div>
    <div class="response-content flex-grow border border-gray-200 rounded-md overflow-auto" v-if="responseContent">
      <pre>{{ responseContent }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const activeName = ref('first')

let userInput = ref({
  username: "",
  password: "",
  forbidden: false
})

let userResult: any = {}

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
  const { data } = event
  if (data && data.document) {
    userInput.value = data.document
    userInput.value.password = ""
  }

  const { response } = data
  if (typeof response === 'string')
    responseContent.value = response
  else if (typeof response === 'object')
    responseContent.value = JSON.stringify(response, null, 2)
})

function onClickTab(tab: any) {
  if (tab.paneName === 'first') {
    delete userResult.forbidden
  } else if (tab.paneName === 'second') {
    delete userResult.password
  }
  if (responseContent.value) {
    responseContent.value = ""
  }
}

function onSubmit() {
  userResult = {
    username: userInput.value.username,
    password: userInput.value.password
  }
  onExecute()
}

function onLogoff() {
  userInput.value.forbidden = true
  userResult = {
    username: userInput.value.username,
    forbidden: true
  }
  onExecute()
}

function onExecute() {
  if (Caller) {
    const message: PluginWidgetResult = { action: PluginWidgetAction.Execute, result: { userInfo: userResult }, handleResponse: true, applyAccessTokenField: 'url' }
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
