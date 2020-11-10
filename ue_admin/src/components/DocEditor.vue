<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <tms-el-json-doc
      :is-submit="isSubmit"
      :schema="body"
      :doc="document"
      v-on:submit="onJsonDocSubmit"
      :on-file-submit="handleFileSubmit"
      :on-axios="handleAxios"
      :on-file-download="handleDownload"
    ></tms-el-json-doc>
  </el-dialog>
</template>
<script>
import { ElJsonDoc as TmsElJsonDoc } from 'tms-vue-ui'
import { TmsAxios } from 'tms-vue'
import utils from '../tms/utils'
import apiDoc from '../apis/document'
import apiSchema from '../apis/schema'

export default {
  name: 'DocEditor',
  components: { TmsElJsonDoc },
  props: {
    dialogVisible: { default: true },
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
      return TmsAxios.ins('mongodb-api')
    },
    handleDownload(name, url) {
      const access_token = sessionStorage.getItem('access_token')
      window.open(
        `${process.env.VUE_APP_BACK_API_FS}${url}?access_token=${access_token}`
      )
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
        return apiDoc
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
      if (Object.keys(utils).length) {
        console.log(1)

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
        apiDoc
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
        apiDoc
          .create(this.bucketName, this.dbName, this.collection.name, newDoc)
          .then(newDoc => this.$emit('submit', newDoc))
          .finally(() => (this.isSubmit = false))
      }
    },
    async handleProperty() {
      let tags =
        (process.env.VUE_APP_TAGS && process.env.VUE_APP_TAGS.split(',')) ||
        this.collection.tags
      let body = {}
      if (tags && tags.length) {
        for (let i = 0; i < tags.length; i++) {
          let schemas = await apiSchema.listByTag(this.bucketName, tags[i])
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
    async open(bucketName, dbName, collection, doc) {
      this.bucketName = bucketName
      this.dbName = dbName
      this.collection = collection
      if (process.env.VUE_APP_FRONT_DOCEDITOR_ADD) {
        let str = process.env.VUE_APP_FRONT_DOCEDITOR_ADD.replace(/\s/g, '')
        this.plugins = str.split(',')
      }
      await this.handleProperty()
      if (doc && doc._id) {
        if (process.env.VUE_APP_FRONT_DOCEDITOR_MODIFY) {
          let str = process.env.VUE_APP_FRONT_DOCEDITOR_MODIFY.replace(
            /\s/g,
            ''
          )
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
