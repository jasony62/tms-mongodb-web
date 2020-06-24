import Vue from 'vue'
import App from './App.vue'
import NoBucket from './NoBucket.vue'
import router from './router'
import store from './store'
import '@/assets/css/common.less'
import { Message } from 'element-ui'
import { Login } from 'tms-vue-ui'
import apiLogin from './apis/login.js'
import {
  TmsAxiosPlugin,
  TmsErrorPlugin,
  TmsIgnorableError,
  TmsLockPromise
} from 'tms-vue'

Vue.config.productionTip = false

Vue.use(TmsAxiosPlugin).use(TmsErrorPlugin)

const { fnGetCaptcha, fnGetJwt } = apiLogin
const LoginSchema = [
  {
    key: process.env.VUE_APP_LOGIN_KEY_USERNAME || 'username',
    type: 'text',
    placeholder: '用户名'
  },
  {
    key: process.env.VUE_APP_LOGIN_KEY_PASSWORD || 'password',
    type: 'password',
    placeholder: '密码'
  },
  {
    key: process.env.VUE_APP_LOGIN_KEY_PIN || 'pin',
    type: 'code',
    placeholder: '验证码'
  }
]
Vue.use(Login, { schema: LoginSchema, fnGetCaptcha, fnGetToken: fnGetJwt })

const LoginPromise = (function() {
  let login = new Login(LoginSchema, fnGetCaptcha, fnGetJwt)
  let ins = new TmsLockPromise(function() {
    return login
      .showAsDialog(function(res) {
        Message({ message: res.msg, type: 'error', customClass: 'mzindex' })
      })
      .then(token => {
        sessionStorage.setItem('access_token', token)
        return `Bearer ${token}`
      })
  })
  return ins
})()

function getAccessToken() {
  if (LoginPromise.isRunning()) {
    return LoginPromise.wait()
  }

  let token = sessionStorage.getItem('access_token')
  if (!token) {
    return LoginPromise.wait()
  }

  return `Bearer ${token}`
}

function onRetryAttempt(res) {
  if (res.data.code === 20001) {
    return LoginPromise.wait().then(() => {
      return true
    })
  }
  return false
}

function onResultFault(res) {
  Message({
    showClose: true,
    message: res.data.msg,
		duration: 3000,
    type: 'error'
  })
  return Promise.reject(new TmsIgnorableError(res.data))
}

function onResponseRejected(err) {
  return Promise.reject(new TmsIgnorableError(err))
}

let rules = []
if (process.env.VUE_APP_BACK_AUTH_SERVER) {
  let accessTokenTule = Vue.TmsAxios.newInterceptorRule({
    requestHeaders: new Map([['Authorization', getAccessToken]]),
    onRetryAttempt
  })
  rules.push(accessTokenTule)
}
let responseRule = Vue.TmsAxios.newInterceptorRule({
  onResultFault,
  onResponseRejected
})
rules.push(responseRule)

Vue.TmsAxios({ name: 'mongodb-api', rules })

Vue.TmsAxios({ name: 'auth-api' })

Vue.directive('loadmore', {
  bind(el, binding) {
    const selectWrap = el.querySelector('.el-table__body-wrapper')
    selectWrap.addEventListener('scroll', function() {
      const scrollDistance =
        this.scrollHeight - this.scrollTop - this.clientHeight
      if (scrollDistance <= 0) {
        binding.value()
      }
    })
  }
})

function entryApp() {
  new Vue({
    router,
    store,
    render: h => h(App)
  }).$mount('#app')
}

function entryNoBucket() {
  new Vue({
    render: h => h(NoBucket)
  }).$mount('#app')
}

/* 是否开启多租户模式 */
if (/yes|true/i.test(process.env.VUE_APP_TMW_REQUIRE_BUCKET)) {
  store.dispatch('listBuckets').then(data => {
    const { buckets } = data
    buckets.length === 0 ? entryNoBucket() : entryApp()
  })
} else {
  entryApp()
}
