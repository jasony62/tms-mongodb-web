<template>
  <tms-frame
    class="tmw-collection"
    :display="{ header: true, footer: true, right: true }"
    :leftWidth="'20%'"
  >
    <template v-slot:header>
      <router-link :to="{
          name: 'database',
          params: { dbName }
        }">返回</router-link>
    </template>
    <template v-slot:center>
      <el-table :data="documents" stripe style="width: 100%">
        <el-table-column
          v-for="(s, k) in collection.schema.body.properties"
          :key="k"
          :prop="k"
          :label="s.title"
        ></el-table-column>
        <el-table-column fixed="right" label="操作" width="180">
          <template slot-scope="scope">
            <el-button size="mini" @click="editDocument(scope.row)">修改</el-button>
            <el-button size="mini" @click="removeDocument(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
    <template v-slot:right>
      <el-button @click="createDocument">添加文档</el-button>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { mapState } from 'vuex'
import { Frame } from 'tms-vue-ui'
Vue.use(Frame)
import { Table, TableColumn, Input, Row, Col, Button } from 'element-ui'
Vue.use(Table)
  .use(TableColumn)
  .use(Input)
  .use(Row)
  .use(Col)
  .use(Button)

import DocEditor from '../components/DocEditor.vue'
import { collection as apiCol, doc as apiDoc } from '../apis'

export default {
  name: 'Collection',
  props: ['dbName', 'clName'],
  data() {
    return {
      collection: { schema: { body: { properties: {} } } }
    }
  },
  computed: {
    ...mapState(['documents'])
  },
  methods: {
    listDocument() {
      this.$store.dispatch({
        type: 'listDocument',
        db: this.dbName,
        collection: this.clName
      })
    },
    createDocument() {
      let editor = new Vue(DocEditor)
      editor.open(this.dbName, this.collection).then(newDoc => {
        this.$store.commit({
          type: 'appendDocument',
          document: newDoc
        })
      })
    },
    editDocument(doc) {
      let editor = new Vue(DocEditor)
      editor.open(this.dbName, this.collection, doc).then(newDoc => {
        Object.assign(doc, newDoc)
        this.$store.commit({
          type: 'updateDocument',
          document: newDoc
        })
      })
    },
    removeDocument(document) {
      apiDoc.remove(this.dbName, this.clName, document._id).then(() => {
        this.$store.commit({ type: 'removeDocument', document })
      })
    }
  },
  mounted() {
    apiCol.byName(this.dbName, this.clName).then(collection => {
      this.collection = collection
      this.listDocument()
    })
  }
}
</script>
