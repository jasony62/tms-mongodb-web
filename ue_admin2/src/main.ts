import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { TmsAxiosPlugin, TmsAxios } from 'tms-vue3'
import { Frame, Flex } from 'tms-vue3-ui'
import router from './router'
import App from './App.vue'
import ElementPlus from 'element-plus'
import { getLocalToken, setLocalToken } from './global'
import { ElMessage } from 'element-plus'
import './index.css'
import 'element-plus/dist/index.css'
import 'tms-vue3-ui/dist/es/frame/style/index.css'
import 'tms-vue3-ui/dist/es/flex/style/index.css'

function initFunc() {
  let token = getLocalToken()
  if (!token) return router.push('/login')
  let authToken = `Bearer ${token}`
  let rulesObj: any = {
    requestHeaders: new Map([['Authorization', authToken]]),
    onResultFault: (res: any) => {
      return new Promise((resolve, reject) => {
        ElMessage.error(res.data.msg || '发生业务逻辑错误')
        reject(res.data)
      })
    },
    onRetryAttempt: (res: any) => {
      return new Promise((resolve, reject) => {
        if (res.data.code === 20001) {
          ElMessage({
            showClose: true,
            message: res.data.msg || '登录失效请重新登录',
            type: 'error',
            onClose: function () {
              setLocalToken('')
              router.push('/login')
            },
          })
        }
        reject(res.data)
      })
    },
  }
  let rule = TmsAxios.newInterceptorRule(rulesObj)
  TmsAxios.ins({ name: 'mongodb-api', rules: [rule] })
}

TmsAxios.ins({ name: 'auth-api' })

localStorage.debug = '*'

createApp(App)
  .use(router)
  .use(createPinia())
  .use(TmsAxiosPlugin)
  .use(Frame)
  .use(Flex)
  .use(initFunc)
  .use(ElementPlus)
  .mount('#app')
