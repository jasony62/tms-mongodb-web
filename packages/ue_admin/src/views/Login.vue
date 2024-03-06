<template>
  <div class="grid place-items-center h-screen">
    <div class="border-2 rounded w-1/4">
      <login :schema="schema()" :fn-captcha="fnCaptcha" :fn-login="fnLogin" :on-success="fnSuccessLogin"
        :on-fail="fnFailLogin">
      </login>
      <div class="flex flex-nowrap pb-4">
        <router-link class="flex-grow pl-4" :to="{ path: 'Smscode' }">短信登录</router-link>
        <router-link class="flex-grow text-right pr-4" :to="{ path: 'register' }">注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Login, LoginResponse } from 'tms-vue3-ui'
import 'tms-vue3-ui/dist/es/login/style/tailwind.scss'
import { schema } from '@/data/login'
import apiAuth from '@/apis/auth'
import { setLocalToken } from '@/global'
import facStore from '@/store'

const { fnCaptcha, fnLogin, fnClient } = apiAuth
const { proxy }: any = getCurrentInstance()
const router = useRouter()
const store = facStore()
/**
 * 登录成功
 */
const fnSuccessLogin = async (response: LoginResponse) => {
  if (response.result?.access_token) {
    const { access_token } = response.result
    /**
     * 获取账号信息
     */
    const clientInfo = await fnClient(access_token)
    /**
     * 保存token
     */
    setLocalToken(access_token)
    store.clientInfo = clientInfo
    /**
     * 返回登录前页面或首页
     */
    const history = proxy.$tmsRouterHistory.history
    const path = history.slice(-2, -1).join()
    if (path && ['/register', '/smscode'].indexOf(path) === -1) {
      // router.back()
      router.push({ path })
    } else {
      router.push({ name: 'home' })
    }
  }
}
/**
 * 登录失败
 * @param response 
 */
const fnFailLogin = (response: LoginResponse) => {
  ElMessage.error(response.msg || '登录失败')
}
</script>@/apis/auth