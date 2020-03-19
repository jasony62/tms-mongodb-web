<template>
  <div class="login">
    <tms-login :on-success="fnSuccessToken" class="pool-mongo"></tms-login>
  </div>
</template>
<script>
export default {
  methods: {
    fnSuccessToken(newToken) {
      window.sessionStorage.setItem('access_token', newToken)
      if (this.$tmsRouterHistory.canBack()) {
        this.$router.back()
      } else {
        this.$router.push('/home')
      }
    }
  }
}
</script>
<style scope>
.login {
  display: flex;
  justify-content: center;
  margin-top: 200px;
  /* transform: translate(-50%, -50%); */
}
.login .pool-mongo {
  border: 1px solid #ddd;
}
</style>