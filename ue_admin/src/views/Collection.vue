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
          params: { dbName }
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
import apiCol from '../apis/collection'
import apiDoc from '../apis/document'

export default {
  name: 'Collection',
  props: ['dbName', 'clName'],
  data() {
    return {
      collection: null
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
      editor.open('create', this.dbName, this.collection).then(newDoc => {
        this.$store.commit({
          type: 'appendDocument',
          document: newDoc
        })
      })
    },
    editDocument(doc) {
      let editor = new Vue(DocEditor)
      editor.open('update', this.dbName, this.collection, doc).then(newDoc => {
        Object.assign(doc, newDoc)
        this.$store.commit({
          type: 'updateDocument',
          document: doc
        })
      })
    },
    removeDocument(document) {
      apiDoc.remove(this.db, this.clName, document._id).then(() => {
        this.$store.commit({ type: 'removeDocument', document })
      })
    }
  },
  mounted() {
    apiCol.byName(this.dbName, this.clName).then(collection => {
      this.collection = collection
    })
    this.listDocument()
  }
}
</script>
