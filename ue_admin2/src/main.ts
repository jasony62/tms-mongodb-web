import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { TmsAxiosPlugin, TmsAxios } from 'tms-vue3'
import { Frame, Flex } from 'tms-vue3-ui'
import router from './router'
import App from './App.vue'
import ElementPlus from 'element-plus'
import { getToken } from './global'
//import { schema } from './data/login'
//import apiLogin from './apis/login'
//const { fnGetCaptcha: fnCaptcha, fnGetToken: fnLogin } = apiLogin

import './index.css'
import 'element-plus/dist/index.css'
import 'tms-vue3-ui/dist/es/frame/style/index.css'
import 'tms-vue3-ui/dist/es/flex/style/index.css'

createApp(App)
  .use(router)
  .use(createPinia())
  .use(TmsAxiosPlugin)
  .use(Frame)
  .use(Flex)
  .use(ElementPlus)
  .mount('#app')
let token = getToken()
if (!token) {
  router.push('/login')
}
token = `Bearer ${token}`
const rulesObj: any = {
  requestHeaders: new Map([['Authorization', token]]),
}
let rule = TmsAxios.newInterceptorRule(rulesObj)
TmsAxios.ins({ name: 'mongodb-api', rules: [rule] })
TmsAxios.ins({ name: 'auth-api' })