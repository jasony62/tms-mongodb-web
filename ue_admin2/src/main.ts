import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  TmsAxios,
  TmsAxiosPlugin,
  TmsErrorPlugin,
  TmsIgnorableError,
  TmsLockPromise,
  TmsRouterHistoryPlugin,
} from 'tms-vue3'
import { Frame, Flex, Login, SubmitDataItem, LoginResponse } from 'tms-vue3-ui'
import router from './router'
import App from './App.vue'
import ElementPlus, { ElMessage } from 'element-plus'
import { getLocalToken, setLocalToken } from './global'
import './index.css'
import 'element-plus/dist/index.css'
import 'tms-vue3-ui/dist/es/frame/style/index.css'
import 'tms-vue3-ui/dist/es/flex/style/index.css'
import './assets/common.scss'
import apiAuth from '@/apis/login'
const { fnCaptcha, fnLogin } = apiAuth

const LoginSchema: SubmitDataItem[] = [
  {
    key: 'uname',
    type: 'text',
    placeholder: '用户名',
  },
  {
    key: 'password',
    type: 'password',
    placeholder: '密码',
  },
  {
    key: 'pin',
    type: 'captcha',
    placeholder: '验证码',
  },
]

const LoginPromise = (function () {
  const fnSuccessLogin = function (response: LoginResponse) {
    const token = response.result.access_token
    setLocalToken(token)

    ElMessage({
      showClose: true,
      message: '登录成功',
      duration: 3000,
      type: 'success',
      zIndex: 100001,
    })
    return `Bearer ${token}`
  }
  let ins = new TmsLockPromise(function () {
    const loginEle = Login.open({
      schema: LoginSchema,
      fnCaptcha,
      fnLogin,
      onSuccess: fnSuccessLogin,
    })

    console.log(loginEle)

    return loginEle
  })

  return ins
})()

setTimeout(() => {})

function getAccessToken() {
  if (LoginPromise.isRunning()) {
    return LoginPromise.wait()
  }

  let token = getLocalToken()
  if (!token) {
    return LoginPromise.wait()
  }

  return `Bearer ${token}`
}

function onRetryAttempt(res: any) {
  if (res.data.code === 20001) {
    return LoginPromise.wait().then(() => {
      return true
    })
  }
  return false
}

function onResultFault(res: any) {
  ElMessage({
    showClose: true,
    message: res.data.msg,
    duration: 3000,
    type: 'error',
  })
  return Promise.reject(new TmsIgnorableError(res.data))
}

function onResponseRejected(err: any) {
  return Promise.reject(new TmsIgnorableError(err))
}

let rules = []
let accessTokenRule = TmsAxios.newInterceptorRule({
  requestHeaders: new Map([['Authorization', getAccessToken]]),
  onRetryAttempt,
})
rules.push(accessTokenRule)

let responseRule = TmsAxios.newInterceptorRule({
  onResultFault,
  onResponseRejected,
})
rules.push(responseRule)

TmsAxios.ins({ name: 'auth-api' })
TmsAxios.ins({ name: 'mongodb-api', rules: rules })

TmsAxios.ins({ name: 'master-api' })

const app = createApp(App)
let settings // 全局设置
try {
  let rsp = await TmsAxios.ins('master-api').get('/settings.json')
  settings = rsp.data
} catch (e) {
  settings = {}
}

localStorage.debug = '*'

app
  .use(router)
  .use(createPinia())
  .use(TmsAxiosPlugin)
  .use(TmsErrorPlugin)
  .use(TmsRouterHistoryPlugin, { router })
  .use(Frame)
  .use(Flex)
  .use(ElementPlus)
  .mount('#app')
