<template>
  <div class="login-frame">
    <h3 class="login-frame__title">{{title}}</h3>
    <div class="login">
      <tms-login :on-success="fnSuccessToken" class="tms-login"></tms-login>
    </div>
  </div>
</template>
<script>
export default {
  data() {
    return {
      title: process.env.VUE_APP_TITLE
    }
  },
  methods: {
    fnSuccessToken(newToken) {
      this.$setToken(newToken)
      if (this.$tmsRouterHistory.canBack()) {
        this.$router.back()
      } else {
        this.$router.push({ name: 'home' })
      }
    }
  }
}
</script>
<style lang="less" scoped>
.login-frame {
  margin-top: 200px;

  .login-frame__title {
    text-align: center;
  }

  .login {
    display: flex;
    justify-content: center;
    /* transform: translate(-50%, -50%); */

    .tms-login {
      border: 1px solid #ddd;
    }
  }
}
</style>