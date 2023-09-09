<template>
  <tms-frame id="tmw-database" :display="{ header: true, footer: true, right: true }" :leftWidth="'20%'">
    <template v-slot:header></template>
    <template v-slot:center>
      <tms-flex direction="column">
        <el-table :data="dbs" stripe style="width: 100%" class="tms-table" @selection-change="changeDbSelect"
          :max-height="dymaicHeight">
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column label="数据库" width="180">
            <template slot-scope="scope">
              <router-link :to="{ name: 'database', params: { dbName: scope.row.name } }">{{ scope.row.name
              }}</router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="名称" width="180"></el-table-column>
          <el-table-column prop="description" label="说明"></el-table-column>
          <el-table-column fixed="right" label="操作" width="250">
            <template slot-scope="scope">
              <el-button v-if="!scope.row.top || scope.row.top == 0" @click="topDb(scope.row, 'up')" size="mini"
                type="text">置顶</el-button>
              <el-button v-if="scope.row.top == 10000" disabled size="mini" type="text">已置顶</el-button>
              <el-button v-if="scope.row.top == 10000" @click="topDb(scope.row, 'down')" size="mini"
                type="text">取消置顶</el-button>
              <el-button size="mini" @click="editDb(scope.row)" type="text">修改</el-button>
              <el-button size="mini" @click="removeDb(scope.row)" type="text" v-if="false">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <tms-flex class="tmw-pagination">
          <span class="tmw-pagination__text">已选中 {{ multipleDb.length }} 条数据</span>
          <el-pagination layout="total, sizes, prev, pager, next" background :total="dbBatch.total"
            :page-sizes="[10, 25, 50, 100]" :current-page="dbBatch.page" :page-size="dbBatch.size"
            @current-change="changeDbPage" @size-change="changeDbSize"></el-pagination>
        </tms-flex>
      </tms-flex>
    </template>
    <template v-slot:right>
      <el-button @click="createDb">添加数据库</el-button>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import store from '@/store'
import { Batch } from 'tms-vue'
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

import DbEditor from '../components/DbEditor.vue.js'
import createDbApi from '../apis/database.js'

// 查找条件下拉框分页包含记录数
let LIST_PAGE_SIZE = 100

export default {
  name: 'Home',
  props: {
    bucketName: String,
    tmsAxiosName: {
      type: String,
      default: 'mongodb-api'
    }
  },
  data() {
    return {
      multipleDb: [],
      dbBatch: new Batch()
    }
  },
  created() {
    this.dymaicHeight = window.innerHeight * 0.8
  },
  computed: {
    dbs() {
      return store.state.dbs
    }
  },
  methods: {
    createDb() {
      const editor = new Vue(DbEditor)
      editor.open('create', this.tmsAxiosName, this.bucketName).then(newDb => {
        store.commit({
          type: 'appendDatabase',
          db: newDb,
          bucket: this.bucketName
        })
        this.listDbByKw(null)
      })
    },
    editDb(db) {
      const editor = new Vue(DbEditor)
      editor
        .open('update', this.tmsAxiosName, this.bucketName, db)
        .then(newDb => {
          const index = this.dbs.find(item => item === db)
          Object.keys(newDb).forEach(k => {
            Vue.set(db, k, newDb[k])
          })
          store.commit({
            type: 'updateDatabase',
            db: newDb,
            index,
            bucket: this.bucketName
          })
        })
    },
    removeDb(db) {
      store.dispatch('removeDatabase', { db, bucket: this.bucketName })
      this.listDbByKw(null)
    },
    topDb(db, type) {
      createDbApi(this.TmsAxios(this.tmsAxiosName))
        .top(this.bucketName, db._id, type)
        .then(() => {
          this.listDbByKw(null)
        })
    },
    listDbByKw(keyword) {
      store
        .dispatch('listDatabase', {
          bucket: this.bucketName,
          keyword: keyword,
          size: LIST_PAGE_SIZE
        })
        .then(batch => {
          this.dbBatch = batch
        })
    },
    changeDbPage(page) {
      this.dbBatch.goto(page)
    },
    changeDbSize(size) {
      this.dbBatch.size = size
      this.dbBatch.goto(1)
    },
    changeDbSelect(val) {
      this.multipleDb = val
    }
  },
  mounted() {
    this.listDbByKw(null)
  }
}
</script>
