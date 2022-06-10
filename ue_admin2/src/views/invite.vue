<template>
  <div class="grid place-items-center h-screen">
    <div class="border-2 rounded w-1/4 p-4 grid grid-cols-1 gap-y-4">
      <p>空间邀请</p>
      <el-input placeholder="请输入用户昵称" v-model="nickname"></el-input>
      <el-input placeholder="请输入邀请码" v-model="inviteCode"></el-input>
      <el-button @click="acceptInvite" type="primary">加入</el-button>
    </div>
  </div>

</template>
<script setup lang="ts">
import apiInvite from '@/apis/invite'
import { onMounted, reactive, ref, toRaw } from 'vue'
const nickname = ref('')
const bucket = ref('')
const inviteCode = ref('')
const acceptInvite = () => {
  const json: any = getUrlParams()
  console.log('json', json)
  apiInvite.accept(json.bucket, nickname.value, inviteCode.value).then(() => {
    location.href = `/bucket`
  })
}
const getUrlParams = () => {
  let str = location.href
  console.log('str', str)
  const num = str.indexOf('?')
  str = str.substr(num + 1)
  let arr: any = str.split('&')
  let json: any = {}
  for (let i = 0; i < arr.length; i++) {
    arr[i] = arr[i].split('=')
    json[arr[i][0]] = arr[i][1]
  }
  return json
}
</script>
<!-- <style lang="sass" scoped>
.invite {
  height: 100vh;
  background-color: #f5f5f5;

  .box-card {
    margin-top: 20px;
  }
}
</style> -->

