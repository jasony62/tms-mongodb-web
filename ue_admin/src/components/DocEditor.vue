<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <tms-el-json-doc :schema="body" :doc="document" v-on:submit="onJsonDocSubmit" :on-file-submit="handleFileSubmit"></tms-el-json-doc>
  </el-dialog>
</template>
<script>
import { ElJsonDoc as TmsElJsonDoc } from 'tms-vue-ui'
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
      body: {},
      collection: null,
      destroyOnClose: true,
      closeOnClickModal: false,
      document: {}
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
      } else {
        apiDoc
          .create(this.bucketName, this.dbName, this.collection.name, newDoc)
          .then(newDoc => this.$emit('submit', newDoc))
      }
    },
    async handleProperty() {
      let tags = (process.env.VUE_APP_TAGS && process.env.VUE_APP_TAGS.split(',')) || this.collection.tags
      let body = {}
      if (tags && tags.length) {
        for(let i=0; i<tags.length; i++) {
          let schemas = await apiSchema.listByTag(this.bucketName, tags[i])
          schemas.forEach(schema => {
            Object.entries(schema.body).forEach(([key, val]) => {
              if (val && typeof val === 'object') {
                // 如果属性值为空就不合并
                if (!body[key]) body[key] = {}
                if (JSON.stringify(val)!=='{}') Object.assign(body[key], val)
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
      await this.handleProperty()
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
