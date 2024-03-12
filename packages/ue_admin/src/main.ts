// @ts-nocheck
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  TmsAxiosPlugin,
  TmsAxios,
  TmsErrorPlugin,
  TmsIgnorableError,
  TmsLockPromise,
  TmsRouterHistoryPlugin,
} from 'tms-vue3'
import { Frame, Flex, Login, LoginResponse, JsonSchema } from 'tms-vue3-ui'
import router from './router'
import App from './App.vue'
import ElementPlus, { ElMessage } from 'element-plus'
import {
  init as initGlobalSettings,
  getLocalToken,
  setLocalToken,
} from './global'
import './index.css'
import 'element-plus/dist/index.css'
import 'tms-vue3-ui/dist/es/frame/style/index.css'
import 'tms-vue3-ui/dist/es/flex/style/index.css'
import './assets/common.scss'
import apiAuth from '@/apis/auth'
import { schema } from '@/data/login'
import 'gitart-vue-dialog/dist/style.css'
import { GDialog, plugin as dialogPlugin } from 'gitart-vue-dialog'
import 'gitart-vue-dialog/dist/style.css'

const { fnCaptcha, fnLogin } = apiAuth

const LoginPromise = (function () {
  let ins = new TmsLockPromise(function () {
    return new Promise((resolve) => {
      const fnSuccessLogin = function (response: LoginResponse) {
        const token = response.result.access_token
        setLocalToken(token)
        resolve(`Bearer ${token}`)
      }
      Login.open({
        schema: schema(),
        fnCaptcha,
        fnLogin,
        onSuccess: fnSuccessLogin,
        closeAfterSuccess: true,
      })
    })
  })
  return ins
})()

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
TmsAxios.ins({ name: 'master-api' })
TmsAxios.ins({ name: 'mongodb-api', rules: rules })

function afterLoadSettings() {
  createApp(App)
    .use(createPinia())
    .use(router)
    .use(TmsAxiosPlugin)
    .use(TmsErrorPlugin)
    .use(TmsRouterHistoryPlugin, { router })
    .use(Frame)
    .use(Flex)
    .use(JsonSchema.install)
    .use(ElementPlus)
    .use(dialogPlugin)
    .use({
      /**
       * 为了解决在路由中可以访问app实例问题
       * @param app
       */
      install: (app) => {
        window['_VueApp'] = app
      },
    })
    .component('GDialog', GDialog)
    .mount('#app')
}

const { VITE_BASE_URL } = import.meta.env
const UrlSettings =
  (VITE_BASE_URL && VITE_BASE_URL !== '/' ? VITE_BASE_URL : '/admin') +
  '/settings.json'

TmsAxios.ins('master-api')
  .get(UrlSettings)
  .then((rsp: any) => {
    let settings = rsp.data
    if (settings && typeof settings === 'string')
      settings = JSON.parse(settings)
    if (settings && typeof settings === 'object') {
      settings.compact = /compact=Y/i.test(location.search)
      settings.extract = /extract=Y/i.test(location.search)
      settings.multiple = !/multiple=N/i.test(location.search)
      initGlobalSettings(settings)
    } else {
      console.log('获得的配置信息不可用', rsp.data)
    }
    afterLoadSettings()
  })
  .catch((e) => {
    console.warn('加载配置失败', e)
    afterLoadSettings()
  })
