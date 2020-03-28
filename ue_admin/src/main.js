import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import apiUser from './apis/user'
import { Login } from 'tms-vue-ui'
import { TmsAxiosPlugin, TmsErrorPlugin, TmsIgnorableError, TmsLockPromise } from 'tms-vue'
import ElementUI from 'element-ui'
import { Message } from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import './assets/css/common.less'
Vue.use(ElementUI)

Vue.use(TmsAxiosPlugin).use(TmsErrorPlugin)

const schema = [
  {
    key: 'username',
    type: 'text',
    placeholder: '用户名'
  },
  {
    key: 'password',
    type: 'password',
    placeholder: '密码'
  },
  {
    key: 'pin',
    type: 'code',
    placeholder: '验证码'
  }
]

Vue.config.productionTip = false

/**
 * 请求中需要包含认证信息
 */
const LoginPromise = (function() {
  let login = new Login(schema, apiUser.getCaptcha, apiUser.getToken)
  return new TmsLockPromise(function() {
    return login.showAsDialog(function (res){Message({ message: res.msg, type: 'error' })}).then(token => {
      sessionStorage.setItem('access_token', token)
      return `Bearer ${token}`
    })
  })
})()

function getAccessToken() {
  // 如果正在登录，等待结果
  if (LoginPromise.isRunning()) {
    return LoginPromise.wait()
  }
  // 如果没有token，发起登录
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
  this.$message({
    showClose: true,
    message: res.data.msg,
    type: 'error',
    duration: 0
  })
  return Promise.reject(new TmsIgnorableError(res.data))
}
// 处理请求过程中发生的异常
function onResponseRejected(err) {
  return Promise.reject(new TmsIgnorableError(err))
}

/**
 * @name 自定义element指令-上拉加载
 */
Vue.directive('loadmore', {
  bind(el, binding) {
    const selectWrap = el.querySelector('.el-table__body-wrapper')
    selectWrap.addEventListener('scroll', function() {
      const scrollDistance = this.scrollHeight - this.scrollTop - this.clientHeight
      if (scrollDistance <= 0) {
        binding.value()
      }
    })
  }
})

/**
 * @name 自定义确认框
 * @description 原型上增加confirm方法，方便统一控制
 * @param {string} msg 提示语 
 * @param {function} successCB 成功回调
 * 
 */
function mountCustomMethod() {
  Vue.prototype.$customeConfirm = (msg = '文件', successCB = function () { return Promise.reject() }) => {
    this.$confirm(`此操作将永久删除该${msg}, 是否继续?`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      successCB().then(() => {
        this.$message({ message: '删除成功!', type: 'success', showClose: true })
      }).catch(err => {
        const { msg } = err
        this.$message({ message: msg || '接口异常', type: 'error', showClose: true })
      })
    }).catch(() => {
      this.$message({ message: '已取消删除', type: 'info', showClose: true })
    });
  }
}

function initFunc() {
  mountCustomMethod()
  let rules = []
  let rulesObj = {onResultFault, onResponseRejected}
  if (process.env.VUE_APP_BACK_AUTH_BASE_REWRITE) {
    rulesObj = { ...rulesObj, 'requestHeaders': new Map([['Authorization', getAccessToken]]), onRetryAttempt}
  } 
  const responseRule = Vue.TmsAxios.newInterceptorRule(rulesObj)
  rules.push(responseRule)

  Vue.TmsAxios({ name: 'mongodb-api', rules })
}

new Vue({
  router,
  store,
  created() {
    initFunc.call(this)
  },
  render: h => h(App)
}).$mount('#app')
