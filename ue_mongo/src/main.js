import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { Message } from 'element-ui'
import LoginDialog from './components/LoginDialog.vue'
Vue.prototype.$message = Message

import { TmsAxiosPlugin, TmsEventPlugin } from 'tms-vue'
Vue.use(TmsAxiosPlugin)
Vue.use(TmsEventPlugin)

import '@/assets/css/element-ui.css'

Vue.config.productionTip = false

new Vue({
  router,
  store,
  created() {
    const token = sessionStorage.getItem('access_token') || ''
    const rule = Vue.TmsAxios.newInterceptorRule({
      requestParams: new Map([['access_token', token]]),
      onRetryAttempt: (res) => {
        if (res.data.code === 20001) {
          return new Promise(reslove => {
            const loginComp = new Vue(LoginDialog)
            loginComp.open().then(newToken => {
              if (newToken) {
                sessionStorage.setItem('access_token', newToken)
                rule.requestParams.set('access_token', newToken)
                reslove(true)
              } else {
                reslove(false)
              }
            })
          })
        }
      },
      onResultFault: (res) => {
        return new Promise(resolve => {
          if (res.data.code !== 0) {
            Message.error({ message: res.data.msg})
          }
          resolve(true)
        })
      }
    })
    Vue.TmsAxios({ name: 'mongodb-api', rules: [rule] })
  },
  render: h => h(App)
}).$mount('#app')
