<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <el-form ref="form" :model="collection" label-position="top">
      <el-form-item label="文件名称（英文）">
        <el-input v-model="collection.name"></el-input>
      </el-form-item>
      <el-form-item label="文件显示名（中文）">
        <el-input v-model="collection.title"></el-input>
      </el-form-item>
      <el-form-item label="文件列定义">
        <el-select placeholder="请选择" v-model="collection.schema_id" clearable filterable>
          <el-option v-for="item in schemas" :key="item._id" :label="item.title" :value="item._id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="文件拓展属性（选填）">
        <el-select placeholder="请选择" v-model="collection.extensionInfo.schemaId" clearable filterable>
          <el-option v-for="item in extensions" :key="item._id" :label="item.title" :value="item._id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="拓展属性详情（选填）" v-show="collection.extensionInfo.schemaId">
        <tms-attr-editor :schemas="extensions" :id="collection.extensionInfo.schemaId" :doc="collection.extensionInfo.info"></tms-attr-editor>
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
import { Dialog, Form, FormItem, Input, Button } from 'element-ui'
Vue.use(Dialog)
  .use(Form)
  .use(FormItem)
  .use(Input)
  .use(Button)

import TmsAttrEditor from './AttrEditor.vue'
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
  components: { TmsAttrEditor },
  data() {
    return {
      mode: '',
      clName: '',
      destroyOnClose: true,
      closeOnClickModal: false,
      schemas: [],
      extensions: []
    }
  },
  mounted() {
    apiSchema.listSimple().then(schemas => {
      this.schemas = schemas
    })
    apiSchema.list('collection').then(extensions => {
      this.extensions = extensions
    })
  },
  methods: {
    onSubmit() {
      
      if (this.mode === 'create')
        apiCollection
          .create(this.dbName, this.collection)
          .then(newCollection => this.$emit('submit', newCollection))
      else if (this.mode === 'update')
        apiCollection
          .update(this.dbName, this.clName, this.collection)
          .then(newCollection => this.$emit('submit', newCollection))
    },
    open(mode, dbName, collection) {
      this.mode = mode
      this.dbName = dbName
      if (mode === 'update') {
        this.clName = collection.name
        Object.assign(this.collection, collection)
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
