<template>
  <div class="grid place-items-center h-screen">
    <div class="border-2 rounded">
      <login
        :schema="schema"
        :fn-captcha="fnCaptcha"
        :fn-login="fnLogin"
        :on-success="fnSuccessLogin"
        :on-fail="fnFailLogin"
      >
      </login>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Login, LoginResponse } from 'tms-vue3-ui'
import 'tms-vue3-ui/dist/es/login/style/tailwind.scss'
import { schema } from '../data/login'
import apiLogin from '../apis/login'
import { setToken } from '../global.js'
import router from '../router/index'
import { ElMessage } from 'element-plus'
const { fnGetCaptcha: fnCaptcha, fnGetToken: fnLogin } = apiLogin
const showLoginDialog = () => {
  Login.open({ schema, fnCaptcha, fnLogin })
}

const fnSuccessLogin = (response: LoginResponse) => {
  console.info('登录成功', response)
  if (response.result && response.result.access_token) {
    setToken(response.result.access_token)
    router.push('/home')
  }
}

const fnFailLogin = (response: LoginResponse) => {
  console.info('登录失败', response)
  ElMessage.error(response.msg || '登录失败')
}
</script>