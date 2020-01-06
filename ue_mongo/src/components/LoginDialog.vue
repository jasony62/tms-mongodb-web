<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <tms-login :data="user" :submit="login"></tms-login>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Dialog } from 'element-ui'
Vue.use(Dialog)

import { Login } from 'tms-vue-ui'
import apiLogin from '../apis/login'
Vue.use(Login, {
  fnGetCaptcha: apiLogin.getCaptcha,
  fnGetToken: apiLogin.getToken
})

export default {
  name: 'LoginDialog',
  props: {
    dialogVisible: { default: true }
  },
  data() {
    return {
      user: [
        {
          key: 'uname',
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
    }
  },
  methods: {
    login(newToken) {
      if (newToken) {
        this.$emit('submit', newToken)
      }
    },
    open() {
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', newToken => {
          this.dialogVisible = false
          resolve(newToken)
        })
      })
    }
  }
}
</script>
