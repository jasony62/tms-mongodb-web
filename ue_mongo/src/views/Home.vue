<template>
  <tms-frame
    id="tmw-database"
    :display="{ header: true, footer: true, right: true }"
    :leftWidth="'20%'"
  >
    <template v-slot:header></template>
    <template v-slot:center>
      <el-table
        :data="dbs"
        stripe
        style="width: 100%"
      >
        <el-table-column label="数据库" width="180">
          <template slot-scope="scope">
            <router-link
              :to="{ name: 'database', params: { dbName: scope.row.name } }"
              >{{ scope.row.name }}</router-link
            >
          </template>
        </el-table-column>
        <el-table-column
          prop="title"
          label="名称"
          width="180"
        ></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column fixed="right" label="操作" width="120" v-if="false">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editDb(scope.row)"
              >修改</el-button
            >
            <el-button type="text" size="mini" @click="removeDb(scope.row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </template>
    <template v-slot:right>
      <el-button @click="createDb">添加数据库</el-button>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { mapState } from 'vuex'
import { Frame, Flex } from 'tms-vue-ui'
Vue.use(Frame).use(Flex)
import { Form, RadioGroup, RadioButton, Table, TableColumn } from 'element-ui'
Vue.use(Form)
  .use(RadioGroup)
  .use(RadioButton)
  .use(Table)
  .use(TableColumn)
import { Button } from 'element-ui'
Vue.use(Button)

import DbEditor from '../components/DbEditor.vue'

export default {
  name: 'Home',
  computed: {
    ...mapState(['dbs'])
  },
  methods: {
    // 获取数据库列表
    listDatabase() {
      this.$store.dispatch('listDatabase')
    },
    createDb() {
      const editor = new Vue(DbEditor)
      editor.open('create').then(newDb => {
        this.$store.commit({
          type: 'appendDatabase',
          db: newDb
        })
      })
    },
  },
  editDb(db) {
    const editor = new Vue(DbEditor)
    editor.open('update', db).then(newDb => {
      Object.keys(newDb).forEach(k => {
        Vue.set(db, k, newDb[k])
      })
      this.$store.commit({
        type: 'updateDatabase',
        db: newDb
      })
    })
  },
  removeDb(db) {
    this.$store.dispatch({ type: 'removeDb', db })
  },
  mounted() {
    this.listDatabase()
  }
}
</script>
