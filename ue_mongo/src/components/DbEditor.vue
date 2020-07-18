<template>
  <el-dialog :closeOnClickModal="false" :visible="true" @close="onClose">
    <el-form ref="form" :model="database" label-position="top">
      <el-form-item label="数据库名称（英文）">
        <el-input v-model="database.name" :disabled="mode==='update'"></el-input>
      </el-form-item>
      <el-form-item label="数据库显示名（中文）">
        <el-input v-model="database.title"></el-input>
      </el-form-item>
      <el-form-item label="扩展属性（选填）">
        <el-select placeholder="请选择" v-model="database.extensionInfo.schemaId" clearable filterable @change="handleExtendId(database.extensionInfo.schemaId, false)">
          <el-option v-for="item in extensions" :key="item._id" :label="item.title" :value="item._id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="扩展属性详情（选填）" v-if="JSON.stringify(extendSchema)!=='{}'">
        <tms-el-json-doc class="tmw-attr-form" ref="attrForm" :schema="extendSchema" :doc="database.extensionInfo.info"></tms-el-json-doc>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="database.description"></el-input>
      </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onClose">取消</el-button>
    </div>
  </el-dialog>
</template>

<script>
import { Dialog, Form, FormItem, Input, Select, Option, Button, Message } from 'element-ui'
import { ElJsonDoc as TmsElJsonDoc } from 'tms-vue-ui'
import createDbApi from '../apis/database'
import createSchemaApi from '../apis/schema'

const componentOptions = {
  components: {
    'el-dialog': Dialog,
    'el-form': Form,
    'el-form-item': FormItem,
    'el-input': Input,
    'el-select': Select,
    'el-option': Option,
    'el-button': Button,
    'tms-el-json-doc': TmsElJsonDoc
  },
  props: {
    bucketName: { type: String },
    mode: { type: String },
    database: {
      type: Object,
      default: function() {
        return {
          name: '',
          title: '',
          description: '',
          extensionInfo: { schemaId: '', info: {} }
        }
      }
    },
    tmsAxiosName: { type: String }
  },
  data() {
    return {
			extensions: [],
			extendSchema: {}
    }
  },
  mounted() {
    document.body.appendChild(this.$el)
    this.listExtensions()
  },
  beforeDestroy() {
    document.body.removeChild(this.$el)
  },
  methods: {
    listExtensions() {
      createSchemaApi(this.TmsAxios(this.tmsAxiosName))
        .list(this.bucketName, 'db').then(extensions => {
          this.extensions = extensions
          this.handleExtendId(this.database.extensionInfo.schemaId, true)
        })
    },
    handleExtendId(id, init) {
			this.extendSchema = {}
			this.extensions.find(item => {
				if (item._id==id) {
					this.$nextTick(() => {
						this.extendSchema = item.body
						if (!init) {
							this.database.extensionInfo.info = {}
						}
					})
				}
			})
		},
		fnSubmit() {
			if (this.mode === 'update') {
        createDbApi(this.TmsAxios(this.tmsAxiosName))
          .update(this.bucketName, this.database.name, this.database)
          .then(newDb => {
            this.$tmsEmit('onDbUpdateSubmit', newDb)
            this.onClose()
          })
      } else if (this.mode === 'create') {
        createDbApi(this.TmsAxios(this.tmsAxiosName))
          .create(this.bucketName, this.database)
          .then(newDb => {
            this.$tmsEmit('onDbCreateSubmit', newDb)
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
				return false;
			}
			this.fnSubmit()
    },
    onClose() {
      this.$destroy()
    }
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