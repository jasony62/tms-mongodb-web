<template>
  <div class="login">
    <tms-login
      :on-success="fnOnSuccess"
      :on-fail="fnOnFail"
      class="admin"
    ></tms-login>
  </div>
</template>
<script>
import { Message } from 'element-ui'

export default {
  methods: {
    fnOnSuccess(token) {
      if (token) {
        sessionStorage.setItem('access_token', token)
        if (this.$tmsRouterHistory.canBack()) {
          this.$router.back()
        } else {
          this.$router.push({ name: 'home' })
        }
      }
    },
    fnOnFail(rsl) {
      Message({
        message: rsl.msg || '登录失败',
        type: 'error',
        showClose: true
      })
    }
  }
}
</script>
<style lang="less" scoped>
.login {
  display: flex;
  justify-content: center;
  margin-top: 200px;
  .admin {
    border: 1px solid #ddd;
  }
}
</style>
