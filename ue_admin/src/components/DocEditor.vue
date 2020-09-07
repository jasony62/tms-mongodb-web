<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <tms-el-json-doc :is-submit="isSubmit" :schema="collection.schema.body" :doc="document" v-on:submit="onJsonDocSubmit" :on-file-submit="handleFileSubmit" :on-axios="handleAxios"></tms-el-json-doc>
  </el-dialog>
</template>
<script>
import { ElJsonDoc as TmsElJsonDoc } from 'tms-vue-ui'
import { TmsAxios } from 'tms-vue'
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
  methods: {
    handleAxios() {    
      return TmsAxios.ins('mongodb-api')
    },
    handleFileSubmit(ref, files) {
      let result = {}
      let objPromises = files.map(file => {
        if (file.hasOwnProperty('url')) {
          return {'name': file.name, 'url': file.url}
        }
        const fileData = new FormData()
        fileData.append('file', file)
        const config = { 'Content-Type': 'multipart/form-data' }
        const dirPath = this.dbName + '/' + this.collection.name + '/' + this.document.order_id + '/' + ref
        return apiDoc.upload(
          { bucket: this.bucketName, dir: dirPath }, fileData, config
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
    async onJsonDocSubmit(slimDoc, newDoc) {
      this.isSubmit = true
      let validate = true
      if (process.env.VUE_APP_SUBMIT_VALITOR_FIELD) {
        const config = process.env.VUE_APP_SUBMIT_VALITOR_FIELD	
        let { priceValidate: onValidate, priceFormat: onFormat } = await import('../tms/utils.js')	
        validate =  Object.entries(newDoc).map(([key, value]) => {
          if (config.indexOf(key)===-1) return true
          const flag = onValidate(this.collection.schema.body.properties, key, value)
          if (flag) newDoc[key] = onFormat(value)
          return flag
        }).every(ele => ele === true)
      }
      if (!validate) {
        this.isSubmit = false
        return false
      }
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
      if (doc && doc._id) Object.assign(this.document, doc)
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
