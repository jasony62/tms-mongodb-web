<template>
  <tms-frame
    class="tmw-login"
    center-color="#f0f3f6"
    left-width="25%"
    right-width="25%"
    :display-sm="{ header: true, footer: false }"
  >
    <template v-slot:header>
			<p>登录</p>
		</template>
    <template v-slot:center>
      <div class="login-account">
        <div class="login-account-form">
          <tms-login :data="user" :submit="login"></tms-login>
        </div>
        <div class="login-account-third"></div>
      </div>
    </template>
  </tms-frame>
</template>
<script>
import Vue from 'vue'
import { Frame, Flex, Login } from 'tms-vue-ui'
Vue.use(Frame).use(Flex)

import apiLogin from '../apis/login'
Vue.use(Login, { fnGetCaptcha: apiLogin.getCaptcha, fnGetToken: apiLogin.getToken })

export default {
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
    login(token) {
      if (token) {
        sessionStorage.setItem('access_token', token)
        // 去掉之前的token
        this.TmsAxios.remove('access_token');
        // 添加token
        this.TmsAxios('mongodb-api').rules[0].requestParams.set('access_token', token)
        this.$router.push('/home')
      }
    }
  }
}
</script>
<style lang="less">
.tmw-login {
  .tms-frame__header {
    margin-top: 40px;
    text-align: center;
    & > p {
      font-size: 18px;
      font-weight: 700;
    }
  }
  .tms-frame__main {
    & > .tms-frame__main__center {
      & > .login-account {
        width: 100%;
        & > .login-account-form {
          width: 330px;
          margin: 0 auto;
          padding: 50px 0;
          & > .login-btn {
            width: 100%;
            margin-bottom: 10px;
          }
        }
      }
    }
  }
}
</style>
