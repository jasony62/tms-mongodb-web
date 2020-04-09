<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <el-form ref="form" :model="database" label-position="top">
      <el-form-item label="数据库名称（英文）">
        <el-input v-model="database.name" :disabled="mode==='update'"></el-input>
      </el-form-item>
      <el-form-item label="数据库显示名（中文）">
        <el-input v-model="database.title"></el-input>
      </el-form-item>
      <el-form-item label="库拓展属性（选填）">
        <el-select placeholder="请选择" v-model="database.extensionInfo.schemaId" clearable filterable>
          <el-option v-for="item in extensions" :key="item._id" :label="item.title" :value="item._id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="拓展属性详情（选填）" v-show="database.extensionInfo.schemaId">
        <tms-attr-editor :schemas="extensions" :id="database.extensionInfo.schemaId" :doc="database.extensionInfo.info"></tms-attr-editor>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="database.description"></el-input>
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
import apiDb from '../apis/database'
import apiSchema from '../apis/schema'

export default {
  name: 'DbEditor',
  props: {
    dialogVisible: { default: true },
    database: {
      type: Object,
      default: function() {
        return { name: '', title: '', description: '', extensionInfo: { schemaId: '', info: {} } }
      }
    }
  },
  components: { TmsAttrEditor },
  data() {
    return {
      mode: '',
      destroyOnClose: true,
      closeOnClickModal: false,
      extensions: []
    }
  },
  mounted() {
    apiSchema.list('db').then(extensions => {
      this.extensions = extensions
    })
  },
  methods: {
    onSubmit() {
      if (this.mode === 'update') {
        apiDb
          .update(this.database.name, this.database)
          .then(newDb => this.$emit('submit', newDb))
      } else if (this.mode === 'create') {
        apiDb.create(this.database).then(newDb => this.$emit('submit', newDb))
      }
    },
    open(mode, db) {
      this.mode = mode
      if (mode === 'update') Object.assign(this.database, db)
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', newDb => {
          this.dialogVisible = false
          resolve(newDb)
        })
      })
    }
  }
}
</script>