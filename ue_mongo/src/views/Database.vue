<template>
  <tms-frame
    class="tmw-collection"
    :display="{ header: true, footer: true, right: true }"
    :leftWidth="'20%'"
  >
    <template v-slot:header>
      <el-breadcrumb separator-class="el-icon-arrow-right">
        <el-breadcrumb-item :to="{ name: 'home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{dbName}}</el-breadcrumb-item>
      </el-breadcrumb>
    </template>
    <template v-slot:center>
      <el-table :data="collections" stripe style="width: 100%">
        <el-table-column label="collection" width="180">
          <template slot-scope="scope">
            <router-link
              :to="{
                name: 'collection',
                params: { dbName, clName: scope.row.name }
              }"
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
        <el-table-column fixed="right" label="操作" width="120">
          <template slot-scope="scope">
            <el-button @click="editCollection(scope.row)"  size="mini">修改</el-button>
            <el-button @click="removeCollection(scope.row)" size="mini"  v-if="false">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
    <template v-slot:right>
      <el-button @click="createCollection">添加文档</el-button>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { mapState } from 'vuex'
import { Frame, Flex } from 'tms-vue-ui'
Vue.use(Frame).use(Flex)
import { Table, TableColumn, Button, Breadcrumb, BreadcrumbItem } from 'element-ui'
Vue.use(Table)
  .use(TableColumn)
  .use(Button)
  .use(Breadcrumb)
  .use(BreadcrumbItem)
import CollectionEditor from '../components/CollectionEditor.vue'

export default {
  name: 'Database',
  props: ['dbName'],
  computed: {
    ...mapState(['collections'])
  },
  data() {
    return {}
  },
  methods: {
    listCollection() {
      this.$store.dispatch({ type: 'listCollection', db: this.dbName })
    },
    createCollection() {
      let editor = new Vue(CollectionEditor)
      editor.open('create', this.dbName).then(newCollection => {
        this.$store.commit({
          type: 'appendCollection',
          collection: newCollection
        })
      })
    },
    editCollection(collection) {
      let editor = new Vue(CollectionEditor)
      editor.open('update', this.dbName, collection).then(newCollection => {
        Object.keys(newCollection).forEach(k => {
          Vue.set(collection, k, newCollection[k])
        })
        this.$store.commit({
          type: 'updateCollection',
          collection
        })
      })
    },
    removeCollection(collection) {
      this.$store.dispatch({
        type: 'removeCollection',
        db: this.dbName,
        collection
      })
    }
  },
  mounted() {
    this.listCollection()
  }
}
</script>
