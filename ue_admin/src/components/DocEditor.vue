<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <tms-el-json-doc :schema="collection.schema.body" :doc="document" v-on:submit="onJsonDocSubmit"></tms-el-json-doc>
  </el-dialog>
</template>
<script>
import { ElJsonDoc as TmsElJsonDoc } from 'tms-vue-ui'
import apiDoc from '../apis/document'

export default {
  name: 'DocEditor',
  components: { TmsElJsonDoc },
  props: {
    dialogVisible: { default: true }
  },
  data() {
    return {
      dbName: '',
      collection: null,
      destroyOnClose: true,
      closeOnClickModal: false,
      document: {
        type: Object,
        default: () => ({})
      }
    }
  },
  methods: {
    onJsonDocSubmit(newDoc) {
      if (this.document && this.document._id) {
        apiDoc
          .update(this.dbName, this.collection.name, this.document._id, newDoc)
          .then(newDoc => this.$emit('submit', newDoc))
      } else {
        apiDoc
          .create(this.dbName, this.collection.name, newDoc)
          .then(newDoc => this.$emit('submit', newDoc))
      }
    },
    open(dbName, collection, doc) {
      this.dbName = dbName
      this.collection = collection
      if (doc && doc._id) this.document = doc
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
