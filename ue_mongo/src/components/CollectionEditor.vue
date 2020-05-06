<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <el-form ref="form" :model="collection" label-position="top">
      <el-form-item label="文档名称（英文）">
        <el-input v-model="collection.name"></el-input>
      </el-form-item>
      <el-form-item label="文档显示名（中文）">
        <el-input v-model="collection.title"></el-input>
      </el-form-item>
      <el-form-item label="文档列定义">
        <el-select placeholder="请选择" v-model="collection.schema_id" clearable filterable>
          <el-option v-for="item in schemas" :key="item._id" :label="item.title" :value="item._id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="文档拓展属性（选填）">
        <el-select placeholder="请选择" v-model="collection.extensionInfo.schemaId" clearable filterable @change="handleExtendId(collection.extensionInfo.schemaId, false)">
          <el-option v-for="item in extensions" :key="item._id" :label="item.title" :value="item._id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="拓展属性详情（选填）" v-if="JSON.stringify(extendSchema)!=='{}'">
				<tms-el-json-doc class="tmw-attr-form" ref="attrForm" :schema="extendSchema" :doc="collection.extensionInfo.info" ></tms-el-json-doc>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="collection.description"></el-input>
      </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </div>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Dialog, Form, FormItem, Input, Button, Message } from 'element-ui'
Vue.use(Dialog)
  .use(Form)
  .use(FormItem)
  .use(Input)
  .use(Button)

import { ElJsonDoc as TmsElJsonDoc } from 'tms-vue-ui'
import apiCollection from '../apis/collection'
import apiSchema from '../apis/schema'

export default {
  name: 'CollectionEditor',
  props: {
    dialogVisible: { default: true },
    dbName: { type: String },
    collection: {
      type: Object,
      default: function() {
        return { name: '', title: '', description: '', schema_id: '', extensionInfo: { schemaId: '', info: {} }}
      }
    }
  },
  components: { TmsElJsonDoc },
  data() {
    return {
      mode: '',
      clName: '',
      destroyOnClose: true,
      closeOnClickModal: false,
      schemas: [],
			extensions: [],
			extendSchema: {}
    }
  },
  mounted() {
    apiSchema.listSimple('document').then(schemas => {
      this.schemas = schemas
    })
    apiSchema.list('collection').then(extensions => {
			this.extensions = extensions
			this.handleExtendId(this.collection.extensionInfo.schemaId, true)
    })
	},
  methods: {
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
			if (this.mode === 'create')
				apiCollection
					.create(this.dbName, this.collection)
					.then(newCollection => this.$emit('submit', newCollection))
			else if (this.mode === 'update')
				apiCollection
					.update(this.dbName, this.clName, this.collection)
					.then(newCollection => this.$emit('submit', newCollection))
		},
    onSubmit() {
			if (this.$refs.attrForm) {
				const tmsAttrForm = this.$refs.attrForm.$refs.TmsJsonDoc
				tmsAttrForm.form().validate(valid => {
					valid ? this.fnSubmit() : Message.error({message: '请填写必填字段'})
				})
				return false;
			}
			this.fnSubmit()
    },
    open(mode, dbName, collection) {
      this.mode = mode
      this.dbName = dbName
      if (mode === 'update') {
				this.clName = collection.name
				this.collection = JSON.parse(JSON.stringify(Object.assign(this.collection, collection)))
      }
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', newCollection => {
          this.dialogVisible = false
          resolve(newCollection)
        })
      })
    }
  }
}
</script>