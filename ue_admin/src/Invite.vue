<template>
  <div class="invite">
    <el-row>
      <el-col :span="8" :offset="8">
        <el-card class="box-card">
          <el-input placeholder="请输入用户昵称" v-model="nickname"></el-input>
          <el-input placeholder="请输入邀请码" v-model="inviteCode" style="margin-top: 20px">
            <span slot="append" @click="acceptInvite">进入</span>
          </el-input>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
<script>
import Vue from 'vue'
import apiInvite from './apis/invite'
export default {
  name: 'Invite',
  data() {
    return {
      nickname: '',
      inviteCode: ''
    }
  },
  methods: {
    acceptInvite() {
      const json = this.getUrlParams()
      apiInvite.accept(json.bucket, this.nickname, this.inviteCode).then(() => {
        location.herf = `/index.html`
      })
    },
    getUrlParams() {
      let str = location.href
      const num = str.indexOf('?')
      str = str.substr(num + 1)
      let arr = str.split('&')
      let json = {}
      for (let i = 0; i < arr.length; i++) {
        arr[i] = arr[i].split('=')
        json[arr[i][0]] = arr[i][1]
      }
      return json
    }
  }
}
</script>
<style lang="less" scoped>
.invite {
  height: 100vh;
  background-color: #f5f5f5;
  .box-card {
    margin-top: 20px;
  }
}
</style>

