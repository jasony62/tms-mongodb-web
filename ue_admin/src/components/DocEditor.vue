<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <el-form ref="form" label-position="top">
      <el-form-item label="内容">
        <el-input type="textarea" v-model="jsonString"></el-input>
      </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </div>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Dialog, Form, FormItem, Input, Button } from 'element-ui'
Vue.use(Dialog)
  .use(Form)
  .use(FormItem)
  .use(Input)
  .use(Button)

import apiDoc from '../apis/document'

export default {
  name: 'DocEditor',
  props: {
    dialogVisible: { default: true },
    document: {
      type: Object,
      default: function() {
        return {}
      }
    }
  },
  data() {
    return {
      mode: '',
      dbName: '',
      collection: null,
      destroyOnClose: true,
      closeOnClickModal: false,
      jsonString: ''
    }
  },
  mounted() {
    if (this.document) {
      let doc = Object.assign({}, this.document)
      delete doc._id
      this.jsonString = JSON.stringify(doc)
    } else {
      this.jsonString = '{}'
    }
  },
  methods: {
    onSubmit() {
      const newDoc = JSON.parse(this.jsonString)
      if (this.document && this.document._id) {
        apiDoc
          .update(this.dbName, this.clName, this.document._id, newDoc)
          .then(newDoc => this.$emit('submit', newDoc))
      } else {
        apiDoc
          .create(this.dbName, this.clName, newDoc)
          .then(newDoc => this.$emit('submit', newDoc))
      }
    },
    open(mode, dbName, collection, doc) {
      this.mode = mode
      this.dbName = dbName
      this.collection = collection
      if (mode === 'update') Object.assign(this.document, doc)
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', newDoc => {
          this.dialogVisible = false
          resolve(newDoc)
        })
      })
    }
  }
}
</script>
