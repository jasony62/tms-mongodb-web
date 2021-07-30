<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <tms-el-json-doc :is-submit="isSubmit" :schema="body" :doc="document" v-on:submit="onJsonDocSubmit" :on-file-submit="handleFileSubmit" :on-axios="handleAxios" :on-file-download="handleDownload"></tms-el-json-doc>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Dialog } from 'element-ui'
Vue.use(Dialog)

import { ElJsonDoc as TmsElJsonDoc } from 'tms-vue-ui'
import utils from '../../ue_mongo/src/tms/utils'
import createDocApi from '../../ue_mongo/src/apis/document'
import createSchemaApi from '../../ue_mongo/src/apis/schema'

const {
  VUE_APP_SCHEMA_TAGS,
  VUE_APP_FRONT_DOCEDITOR_ADD,
  VUE_APP_FRONT_DOCEDITOR_MODIFY
} = process.env

export default {
  name: 'DocEditor',
  components: { TmsElJsonDoc },
  props: {
    dialogVisible: { default: true },
    tmsAxiosName: { type: String },
    bucketName: { type: String }
  },
  data() {
    return {
      dbName: '',
      isSubmit: false,
      body: {},
      document: {},
      collection: null,
      destroyOnClose: true,
      closeOnClickModal: false,
      plugins: []
    }
  },
  methods: {
    handleAxios() {
      return this.TmsAxios(this.tmsAxiosName)
    },
    handleDownload(name, url) {
      const access_token = this.$getToken()
      window.open(`${url}?access_token=${access_token}`)
    },
    handleFileSubmit(ref, files) {
      let result = {}
      let objPromises = files.map(file => {
        if (file.hasOwnProperty('url')) {
          return { name: file.name, url: file.url }
        }
        const fileData = new FormData()
        fileData.append('file', file)
        const config = { 'Content-Type': 'multipart/form-data' }
        return createDocApi(this.TmsAxios(this.tmsAxiosName))
          .upload({ bucket: this.bucketName }, fileData, config)
          .then(path => {
            return Promise.resolve({ url: path, name: file.name })
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
      let validate = true
      if (this.plugins.length) {
        validate = this.plugins
          .map(item => {
            const result = utils[item](this.body, newDoc)
            if (result.msg === 'success') {
              newDoc = result.data
              return true
            } else {
              return false
            }
          })
          .every(ele => ele === true)
      }
      if (!validate) {
        this.isSubmit = false
        return false
      }
      if (this.document && this.document._id) {
        createDocApi(this.TmsAxios(this.tmsAxiosName))
          .update(
            this.bucketName,
            this.dbName,
            this.collection.name,
            this.document._id,
            newDoc
          )
          .then(newDoc => this.$emit('submit', newDoc))
          .finally(() => (this.isSubmit = false))
      } else {
        createDocApi(this.TmsAxios(this.tmsAxiosName))
          .create(this.bucketName, this.dbName, this.collection.name, newDoc)
          .then(newDoc => this.$emit('submit', newDoc))
          .finally(() => (this.isSubmit = false))
      }
    },
    async handleProperty() {
      let tags = VUE_APP_SCHEMA_TAGS
        ? VUE_APP_SCHEMA_TAGS.split(',')
        : this.collection.schema_tags
      let body = {}

      if (tags && tags.length) {
        for (let i = 0; i < tags.length; i++) {
          let schemas = await createSchemaApi(
            this.TmsAxios(this.tmsAxiosName)
          ).listByTag(this.bucketName, tags[i])
          schemas.forEach(schema => {
            Object.entries(schema.body).forEach(([key, val]) => {
              if (val && typeof val === 'object') {
                // 如果属性值为空就不合并
                if (!body[key]) body[key] = {}
                if (JSON.stringify(val) !== '{}') Object.assign(body[key], val)
              } else {
                body[key] = val
              }
            })
          })
        }
        this.body = body
      } else {
        Object.assign(this.body, this.collection.schema.body)
      }
    },
    async open(tmsAxiosName, bucketName, dbName, collection, doc) {
      this.tmsAxiosName = tmsAxiosName
      this.bucketName = bucketName
      this.dbName = dbName
      this.collection = collection
      if (VUE_APP_FRONT_DOCEDITOR_ADD) {
        let str = VUE_APP_FRONT_DOCEDITOR_ADD.replace(/\s/g, '')
        this.plugins = str.split(',')
      }
      await this.handleProperty()
      if (doc && doc._id) {
        if (VUE_APP_FRONT_DOCEDITOR_MODIFY) {
          let str = VUE_APP_FRONT_DOCEDITOR_MODIFY.replace(/\s/g, '')
          this.plugins = str.split(',')
        }
        this.document = JSON.parse(
          JSON.stringify(Object.assign(this.document, doc))
        )
      }
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
