<template>
  <tms-frame id="tmw-database" :display="{ header: true, footer: true, right: true }" :leftWidth="'20%'">
    <template v-slot:header></template>
    <template v-slot:center>
      <el-table :data="dbs" stripe style="width: 100%" class="tms-table">
        <el-table-column label="数据库" width="180">
          <template slot-scope="scope">
            <router-link :to="{ name: 'database', params: { dbName: scope.row.name } }">{{ scope.row.name }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column fixed="right" label="操作" width="250">
          <template slot-scope="scope">
            <el-button v-if="!scope.row.top||scope.row.top==0" @click="topDb(scope.row, 'up')" size="mini" type="text">置顶</el-button>
            <el-button v-if="scope.row.top==10000" disabled size="mini" type="text">已置顶</el-button>
            <el-button v-if="scope.row.top==10000" @click="topDb(scope.row, 'down')" size="mini" type="text">取消置顶</el-button>
            <el-button size="mini" @click="editDb(scope.row)" type="text">修改</el-button>
            <el-button size="mini" @click="removeDb(scope.row)" type="text" v-if="false">删除</el-button>
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
import {
  Form,
  RadioGroup,
  RadioButton,
  Table,
  TableColumn,
  Button
} from 'element-ui'
Vue.use(Form)
  .use(RadioGroup)
  .use(RadioButton)
  .use(Table)
  .use(TableColumn)
  .use(Button)

import DbEditor from '../components/DbEditor.vue'
import { db as apiDb } from '../apis'

export default {
  name: 'Home',
  props: ['bucketName'],
  computed: {
    ...mapState(['dbs'])
  },
  methods: {
    // 获取数据库列表
    listDatabase() {
      this.$store.dispatch({ type: 'listDatabase', bucket: this.bucketName })
    },
    createDb() {
      const editor = new Vue(DbEditor)
      editor.open('create', this.bucketName).then(newDb => {
        this.$store.commit({
          type: 'appendDatabase',
          db: newDb,
          bucket: this.bucketName
        })
      })
    },
    editDb(db) {
      const editor = new Vue(DbEditor)
      editor.open('update', this.bucketName, db).then(newDb => {
        Object.keys(newDb).forEach(k => {
          Vue.set(db, k, newDb[k])
        })
        this.$store.commit({
          type: 'updateDatabase',
          db: newDb,
          bucket: this.bucketName
        })
      })
    },
    removeDb(db) {
      this.$store.dispatch({
        type: 'removeDatabase',
        db,
        bucket: this.bucketName
      })
    },
    topDb(db, type) {
      apiDb.top(db._id, type).then(() => {
        this.listDatabase()
      })
    }
  },
  mounted() {
    this.listDatabase()
  }
}
</script>
