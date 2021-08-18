import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import apiLogin from './apis/login'
import { Login } from 'tms-vue-ui'
import {
  TmsAxiosPlugin,
  TmsErrorPlugin,
  TmsIgnorableError,
  TmsLockPromise
} from 'tms-vue'
import {
  Pagination,
  Dialog,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Input,
  RadioGroup,
  RadioButton,
  Select,
  Option,
  Button,
  Table,
  TableColumn,
  Breadcrumb,
  BreadcrumbItem,
  Form,
  FormItem,
  Tabs,
  TabPane,
  Tag,
  Tree,
  Card,
  Switch,
  InputNumber,
  Upload,
  Alert,
  Image,
  Row,
  Col,
  Icon,
  Message,
  MessageBox
} from 'element-ui'
import './assets/css/common.less'
import { setToken, getToken } from './global.js'

Vue.use(TmsAxiosPlugin).use(TmsErrorPlugin)
Vue.use(Pagination)
  .use(Dialog)
  .use(Dropdown)
  .use(DropdownMenu)
  .use(DropdownItem)
  .use(Input)
  .use(RadioGroup)
  .use(RadioButton)
  .use(Select)
  .use(Option)
  .use(Button)
  .use(Table)
  .use(TableColumn)
  .use(Breadcrumb)
  .use(BreadcrumbItem)
  .use(Form)
  .use(FormItem)
  .use(Tabs)
  .use(TabPane)
  .use(Tag)
  .use(Tree)
  .use(Card)
  .use(Switch)
  .use(InputNumber)
  .use(Upload)
  .use(Alert)
  .use(Image)
  .use(Row)
  .use(Col)
  .use(Icon)
Vue.prototype.$setToken = setToken
Vue.prototype.$getToken = getToken

const { fnGetCaptcha, fnGetToken } = apiLogin
const schema = [
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
Vue.use(Login, { schema, fnGetCaptcha, fnGetToken })
Vue.config.productionTip = false

/**
 * 请求中需要包含认证信息
 */
const LoginPromise = (function() {
  let login = new Login(schema, fnGetCaptcha, fnGetToken)
  return new TmsLockPromise(function() {
    return login
      .showAsDialog(function(res) {
        Message({ message: res.msg, type: 'error', customClass: 'mzindex' })
      })
      .then(token => {
        setToken(token)
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
  let token = getToken()
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
    type: 'error',
    duration: 3000,
    customClass: 'mzindex'
  })
  return Promise.reject(new TmsIgnorableError(res.data))
}

/**
 * 处理请求过程中发生的异常
 */
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
      const scrollDistance =
        this.scrollHeight - this.scrollTop - this.clientHeight
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
  Vue.prototype.$customeConfirm = function(
    msg = '文件',
    successCB = function() {
      return Promise.reject()
    },
    callback
  ) {
    MessageBox.confirm(`此操作将永久删除该【${msg}】, 是否继续?`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        successCB().then(() => {
          Message({
            message: '删除成功!',
            type: 'success',
            showClose: true
          })
          if (callback) callback(null)
        })
      })
      .catch(() => {
        Message({ message: '已取消删除', type: 'info', showClose: true })
      })
  }
}

function initFunc() {
  mountCustomMethod()
  let rules = []
  let rulesObj = { onResultFault, onResponseRejected }
  if (process.env.VUE_APP_BACK_AUTH_BASE) {
    rulesObj = {
      ...rulesObj,
      requestHeaders: new Map([['Authorization', getAccessToken]]),
      onRetryAttempt
    }
  }
  const responseRule = Vue.TmsAxios.newInterceptorRule(rulesObj)
  rules.push(responseRule)

  Vue.TmsAxios({ name: 'mongodb-api', rules })
  Vue.TmsAxios({ name: 'auth-api' })
}

new Vue({
  router,
  store,
  created() {
    initFunc.call(this)
  },
  render: h => h(App)
}).$mount('#app')
