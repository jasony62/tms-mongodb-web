<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <el-tabs v-model="activeTab" type="card" @tab-click="onTabClick">
      <el-tab-pane label="基本信息" name="first"></el-tab-pane>
      <el-tab-pane label="列定义" name="second"></el-tab-pane>
    </el-tabs>
    <el-form v-show="activeTab === 'first'" :model="schema" label-position="top">
      <el-form-item label="集合列定义显示名（中文）">
        <el-input v-model="schema.title"></el-input>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="schema.description"></el-input>
      </el-form-item>
    </el-form>
    <tms-json-schema v-show="activeTab === 'second'" :schema="schema.body"></tms-json-schema>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </div>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
const { TmsJsonSchema } = require('tms-vue-ui')
//import { TmsJsonSchema } from 'tms-vue-ui'
import apiSchema from '../apis'
import {
  Dialog,
  Form,
  FormItem,
  Input,
  Button,
  Tabs,
  TabPane
} from 'element-ui'
Vue.use(Dialog)
  .use(Form)
  .use(FormItem)
  .use(Input)
  .use(Button)
  .use(Tabs)
  .use(TabPane)

export default {
  name: 'SchemaEditor',
  components: { TmsJsonSchema },
  props: {
    dialogVisible: { default: true },
    schema: {
      type: Object,
      default: function() {
        return { title: '', description: '', body: {} }
      }
    }
  },
  data() {
    return {
      mode: '',
      activeTab: 'first',
      destroyOnClose: true,
      closeOnClickModal: false
    }
  },
  methods: {
    onTabClick() {},
    onSubmit() {
      if (this.mode === 'update') {
        apiSchema
          .update(this.schema, this.schema)
          .then(newSchema => this.$emit('submit', newSchema))
      } else if (this.mode === 'create') {
        apiSchema
          .create(this.schema)
          .then(newSchema => this.$emit('submit', newSchema))
      }
    },
    open(mode, schema) {
      this.mode = mode
      if (mode === 'update') Object.assign(this.schema, schema)
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', newSchema => {
          this.dialogVisible = false
          resolve(newSchema)
        })
      })
    }
  }
}
</script>
