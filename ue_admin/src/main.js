import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import apiUser from './apis/user'
import { Login } from 'tms-vue-ui'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import './assets/css/common.less'
Vue.use(ElementUI)

import { TmsAxiosPlugin, TmsEventPlugin } from 'tms-vue'
Vue.use(TmsAxiosPlugin)
Vue.use(TmsEventPlugin)

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
const login = new Login(schema, apiUser.getCaptcha, apiUser.getToken)

Vue.config.productionTip = false

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

new Vue({
  router,
  store,
  created() {
    mountCustomMethod.call(this);
    const token = sessionStorage.getItem('access_token') || ''
    const rule = Vue.TmsAxios.newInterceptorRule({
      requestParams: new Map([['access_token', token]]),
      onRetryAttempt: res => {
        const { code, msg } = res.data
        if (code === 20001) {
          this.$message({ message: msg, type: 'error', showClose: true })
          return new Promise(reslove => {
            let confirm = new Vue(login.component)
            confirm.showAsDialog().then(newToken => {
              if (newToken) {
                sessionStorage.setItem('access_token', newToken)
                rule.requestParams.set('access_token', newToken)
                confirm.removeOverlay()
                reslove(true)
              } else {
                reslove(false)
              }
            })
          })
        }
      }
    })
    Vue.TmsAxios({ name: 'mongodb-api', rules: [rule] })
  },
  render: h => h(App)
}).$mount('#app')
