import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { TmsAxiosPlugin, TmsAxios } from 'tms-vue3'
import { Frame, Flex } from 'tms-vue3-ui'
import router from './router'
import App from './App.vue'
import ElementPlus from 'element-plus'
import { getLocalToken } from './global'

import './index.css'
import 'element-plus/dist/index.css'
import 'tms-vue3-ui/dist/es/frame/style/index.css'
import 'tms-vue3-ui/dist/es/flex/style/index.css'
function initFunc() {
  let token = getLocalToken()
  if (!token) router.push('/login')
  token = `Bearer ${token}`
  const rulesObj: any = {
    requestHeaders: new Map([['Authorization', token]]),
  }

  let rule = TmsAxios.newInterceptorRule(rulesObj)
  TmsAxios.ins({ name: 'mongodb-api', rules: [rule] })
  TmsAxios.ins({ name: 'auth-api' })
}
createApp(App)
  .use(router)
  .use(createPinia())
  .use(TmsAxiosPlugin)
  .use(Frame)
  .use(Flex)
  .use(initFunc)
  .use(ElementPlus)
  .mount('#app')

