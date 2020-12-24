<template>
  <tms-frame class="tmw-bucket" :display="{ header: true, footer: true, right: true }" :leftWidth="'20%'">
    <template v-slot:header>
    </template>
    <template v-slot:center>
      <el-table :data="buckets" stripe style="width: 100%" class="tms-table">
        <el-table-column label="空间" width="180">
          <template slot-scope="scope">
            <router-link :to="{name: 'home', params: { bucketName: scope.row.name }}">{{ scope.row.name }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
        </el-table-column>
      </el-table>
    </template>
    <template v-slot:right>
    </template>
  </tms-frame>
</template>

<script>
import { mapState } from 'vuex'
export default {
  name: 'Bucket',
  computed: {
    ...mapState(['buckets'])
  }
}
</script>

<style>
</style>