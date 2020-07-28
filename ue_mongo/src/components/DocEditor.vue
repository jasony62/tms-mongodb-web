<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <tms-el-json-doc :is-submit="isSubmit" :schema="schema" :doc="document" v-on:submit="onJsonDocSubmit" :on-file-submit="handleFileSubmit"></tms-el-json-doc>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Dialog } from 'element-ui'
Vue.use(Dialog)

import { ElJsonDoc as TmsElJsonDoc } from 'tms-vue-ui'
import apiDoc from '../apis/document'

export default {
  name: 'DocEditor',
  components: { TmsElJsonDoc },
  props: {
    dialogVisible: { default: true },
    bucketName: { type: String }
  },
  data() {
    return {
      isSubmit: false,
      dbName: '',
      collection: null,
      destroyOnClose: true,
      closeOnClickModal: false,
      document: {}
    }
  },
  computed: {
    schema() {
      const col = this.collection
      return col && col.schema && typeof col.schema.body === 'object'
        ? col.schema.body
        : {}
    }
  },
  methods: {
		handleFileSubmit(ref, files) {
			let result = {}
			let objPromises = files.map(file => {
				if (file.hasOwnProperty('url')) {
					return {'name': file.name, 'url': file.url}
				}
				const fileData = new FormData()
				fileData.append('file', file)
				const config = { 'Content-Type': 'multipart/form-data' }
				return apiDoc.upload(
					{ bucket: this.bucketName }, fileData, config
					)
					.then(path => {
            return Promise.resolve({'url': path, 'name': file.name})
          })
					.catch(err => Promise.reject(err))
			})
			return Promise.all(objPromises)
				.then(rsl => { 
					result[ref] = rsl
          return Promise.resolve(result)
				})
				.catch(err => Promise.reject(err))
		},
    onJsonDocSubmit(slimDoc, newDoc) {
      this.isSubmit = true
      if (this.document && this.document._id) {
        apiDoc
          .update(
            this.bucketName,
            this.dbName,
            this.collection.name,
            this.document._id,
            newDoc
          )
          .then(newDoc => this.$emit('submit', newDoc))
          .finally(() => this.isSubmit = false)
      } else {
        apiDoc
          .create(this.bucketName, this.dbName, this.collection.name, newDoc)
          .then(newDoc => this.$emit('submit', newDoc))
          .finally(() => this.isSubmit = false)
      }
    },
    open(bucketName, dbName, collection, doc) {
      this.bucketName = bucketName
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
