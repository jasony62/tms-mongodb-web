<template>
  <el-dialog :closeOnClickModal="false" :visible="true" @close="onClose">
    <el-form ref="form" :model="collection" label-position="top">
      <el-form-item label="集合名称（英文）">
        <el-input v-model="collection.name"></el-input>
      </el-form-item>
      <el-form-item label="集合显示名（中文）">
        <el-input v-model="collection.title"></el-input>
      </el-form-item>
      <el-form-item label="集合文档内容定义">
        <el-select placeholder="请选择" v-model="collection.schema_id" clearable filterable>
          <el-option v-for="schema in schemas" :key="schema._id" :label="schema.title" :value="schema._id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="集合扩展属性（选填）">
        <el-select placeholder="请选择" v-model="collection.extensionInfo.schemaId" clearable filterable @change="handleExtendId(collection.extensionInfo.schemaId, false)">
          <el-option v-for="extension in extensions" :key="extension._id" :label="extension.title" :value="extension._id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="扩展属性详情（选填）" v-if="JSON.stringify(extendSchema)!=='{}'">
        <tms-el-json-doc class="tmw-attr-form" ref="attrForm" :schema="extendSchema" :doc="collection.extensionInfo.info"></tms-el-json-doc>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="collection.description"></el-input>
      </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onClose">取消</el-button>
    </div>
  </el-dialog>
</template>
<script>
import { Dialog, Form, FormItem, Select, Option, Input, Button, Message } from 'element-ui'
import { ElJsonDoc as TmsElJsonDoc } from 'tms-vue-ui'
import createCollectionApi from '../apis/collection'
import createSchemaApi from '../apis/schema'

const componentOptions = {
  components: {
    'el-dialog': Dialog,
    'el-form': Form,
    'el-form-item': FormItem,
    'el-select': Select,
    'el-option': Option,
    'el-input': Input,
    'el-button': Button,
    'tms-el-json-doc': TmsElJsonDoc
  },
  props: {
    bucketName: { type: String },
    mode: { type: String },
    dbName: { type: String },
    collection: {
      type: Object,
      default: function() {
        return {
          name: '',
          title: '',
          description: '',
          schema_id: '',
          extensionInfo: { schemaId: '', info: {} }
        }
      }
    },
    tmsAxiosName: { type: String }
  },
  data() {
    return {
      schemas: [],
			extensions: [],
			extendSchema: {}
    }
  },
  computed: {
    clName() {
      return this.mode==='update' ? this.collection.name : ""
    }
  },
  mounted() {
    document.body.appendChild(this.$el)
    this.listSchemas()
    this.listExtensions()
  },
  beforeDestroy() {
    document.body.removeChild(this.$el)
  },
  methods: {
    listSchemas() {
      createSchemaApi(this.TmsAxios(this.tmsAxiosName))
        .list(this.bucketName, 'document').then(schemas => {
          this.schemas = schemas
        })
    },
    listExtensions() {
      createSchemaApi(this.TmsAxios(this.tmsAxiosName))
        .list(this.bucketName, 'collection').then(extensions => {
          this.extensions = extensions
          this.handleExtendId(this.collection.extensionInfo.schemaId, true)
        })
    },
		handleExtendId(id, init) {
			this.extendSchema = {}
			this.extensions.find(item => {
				if (item._id==id) {
					this.$nextTick(() => {
						this.extendSchema = item.body
						if (!init) {
							this.collection.extensionInfo.info = {}
						}
					})
				}
			})
		},
		fnSubmit() {
			if (this.mode === 'create') {
        createCollectionApi(this.TmsAxios(this.tmsAxiosName))
          .create(this.bucketName, this.dbName, this.collection)
          .then(newCollection => { 
            this.$emit('onColCreateSubmit', newCollection)
            this.onClose()
          })
      } else if (this.mode === 'update') {
        createCollectionApi(this.TmsAxios(this.tmsAxiosName))
          .update(this.bucketName, this.dbName, this.clName, this.collection)
          .then(newCollection => {
            this.$emit('onColUpdateSubmit', newCollection)
            this.onClose()
          })
      }
		},
    onSubmit() {
			if (this.$refs.attrForm) {
				const tmsAttrForm = this.$refs.attrForm.$refs.TmsJsonDoc
				tmsAttrForm.form().validate(valid => {
					valid ? this.fnSubmit() : Message.error({message: '请填写必填字段'})
				})
				return false
			}
			this.fnSubmit()
    },
    onClose() {
      this.$destroy()
    }
      /* if (mode === 'update') {
				
				this.collection = JSON.parse(JSON.stringify(Object.assign(this.collection, collection)))
      } */
  }
}
export default componentOptions

export function createAndMount(Vue, props) {
  const CompClass = Vue.extend(componentOptions)

  const propsData = {
    tmsAxiosName: 'mongodb-api'
  }
  if (props && typeof props === 'object') Object.assign(propsData, props)

  new CompClass({
    propsData
  }).$mount()
}
</script>