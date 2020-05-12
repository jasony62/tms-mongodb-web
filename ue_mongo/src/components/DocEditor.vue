<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <tms-el-json-doc :schema="schema" :doc="document" v-on:submit="onJsonDocSubmit"></tms-el-json-doc>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Dialog, Message } from 'element-ui'
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
		onValidate(schema, key, val) {
			if (isNaN(Number(val))) {
				Message.error({message: schema[key].title + '应填入正确的数字', customClass: 'mzindex'})
				return false
			} 
			if (Number(val) < 0) {
				Message.error({message: schema[key].title + '的值不能小于0', customClass: 'mzindex'})
				return false
			}
			const value = val.split('.')
			if (value.length > 2) {
				Message.error({message: schema[key].title + '格式错误', customClass: 'mzindex'})
				return false
			}
			if (value.length !== 1) {
				const float = value[1]
				if (float.length > 3) {
					Message.error({message: this.schema[key].title + '格式错误,小数点后不能大于3位', customClass: 'mzindex'})
					return false
				}
			}
			return true
		},
		onFormatPrice(val) {
			let arrOfVal = val.split('.')
			if (arrOfVal.length===1) {
				val = val + '.00'
			} else {
				let floatVal = arrOfVal[1].split('')
				if (floatVal.length===1) {
					val = val + '0'
				} else if(floatVal.length===3 && floatVal[2]==='0') {
					val = val.substr(0, val.length-1)
				} 
			}
			return val
		},
    onJsonDocSubmit(newDoc) {
			let validate = true
			if (process.env.VUE_APP_VALITOR_FIELD) {
				const config = process.env.VUE_APP_VALITOR_FIELD		
				validate =  Object.entries(newDoc).map(([key, value]) => {
					if (config.indexOf(key)!==-1) {
						const flag = this.onValidate(this.collection.schema.body.properties, key, value)
						if (flag) newDoc[key] = this.onFormatPrice(value)
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
