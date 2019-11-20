<template>
  <tms-frame
    class="tmw-collection"
    :display="{ header: true, footer: true, left: true, right: true }"
    :leftWidth="'20%'"
  >
    <template v-slot:header>
      <el-button @click="createDocument">添加文档</el-button>
    </template>
    <template v-slot:left>
      <router-link
        :to="{
          name: 'database',
          params: { db }
        }"
        >返回</router-link
      >
    </template>
    <template v-slot:center>
      <tms-flex direction="column">
        <tms-flex v-for="doc in documents" :key="doc._id">
          <div>{{ doc }}</div>
          <div>
            <el-button size="mini" @click="editDocument(doc)">修改</el-button>
            <el-button size="mini" @click="removeDocument(doc)">删除</el-button>
          </div>
        </tms-flex>
      </tms-flex>
    </template>
    <template v-slot:right>
      right
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
import apiDoc from '../apis/document'

export default {
  name: 'Collection',
  props: ['db', 'collection'],
  data() {
    return {}
  },
  computed: {
    ...mapState(['documents'])
  },
  methods: {
    listDocument() {
      this.$store.dispatch({
        type: 'listDocument',
        db: this.db,
        collection: this.collection
      })
    },
    createDocument() {
      let editor = new Vue(DocEditor)
      editor.dbName = this.db
      editor.clName = this.collection
      editor.$on('submit', document => {
        this.$store.commit({
          type: 'appendDocument',
          document
        })
        editor.dialogVisible = false
      })
      editor.$mount()
      document.body.appendChild(editor.$el)
    },
    editDocument(doc) {
      let editor = new Vue(DocEditor)
      editor.dbName = this.db
      editor.clName = this.collection
      editor.document = Object.assign({}, doc)
      editor.$on('submit', newDoc => {
        Object.assign(doc, newDoc)
        this.$store.commit({
          type: 'updateDocument',
          document: doc
        })
        editor.dialogVisible = false
      })
      editor.$mount()
      document.body.appendChild(editor.$el)
    },
    removeDocument(document) {
      apiDoc.remove(this.db, this.collection, document._id).then(() => {
        this.$store.commit({ type: 'removeDocument', document })
      })
    }
  },
  mounted() {
    this.listDocument()
  }
}
</script>
