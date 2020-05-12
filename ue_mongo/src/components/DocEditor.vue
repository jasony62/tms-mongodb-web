<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <tms-el-json-doc :schema="schema" :doc="document" v-on:submit="onJsonDocSubmit"></tms-el-json-doc>
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
    async onJsonDocSubmit(newDoc) {
			let validate = true
			if (process.env.VUE_APP_VALITOR_FIELD) {
				const config = process.env.VUE_APP_VALITOR_FIELD
				let { priceValidate: onValidate, priceFormat: onFormat } = await import('../tms/utils.js')	
				validate =  Object.entries(newDoc).map(([key, value]) => {
					if (config.indexOf(key)!==-1) {
						const flag = onValidate(this.collection.schema.body.properties, key, value)
						if (flag) newDoc[key] = onFormat(value)
						return flag
					}
				}).every(ele => ele === true)
			}
			if (validate) {
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
