<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <tms-el-json-doc
      :schema="collection.schema.body"
      :model="document"
      v-on:submit="onJsonDocSubmit"
    ></tms-el-json-doc>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Dialog } from 'element-ui'
Vue.use(Dialog)

//import { TmsElJsonDoc } from '../../lib'
const { TmsElJsonDoc } = require('tms-vue-ui')

import apiDoc from '../apis/document'

export default {
  name: 'DocEditor',
  components: { TmsElJsonDoc },
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
      closeOnClickModal: false
    }
  },
  methods: {
    onJsonDocSubmit() {
      if (this.document && this.document._id) {
        apiDoc
          .update(
            this.dbName,
            this.collection.name,
            this.document._id,
            this.document
          )
          .then(newDoc => this.$emit('submit', newDoc))
      } else {
        apiDoc
          .create(this.dbName, this.collection.name, this.document)
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
