<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <el-form ref="form" :model="collection" label-position="top">
      <el-form-item label="集合名称（英文）">
        <el-input v-model="collection.name"></el-input>
      </el-form-item>
      <el-form-item label="集合显示名（中文）">
        <el-input v-model="collection.title"></el-input>
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

import apiCollection from '../apis/collection'

export default {
  name: 'CollectionEditor',
  props: {
    dialogVisible: { default: true },
    dbName: { type: String },
    collection: {
      type: Object,
      default: function() {
        return { name: '', title: '', description: '' }
      }
    }
  },
  data() {
    return {
      mode: '',
      destroyOnClose: true,
      closeOnClickModal: false
    }
  },
  methods: {
    onSubmit() {
      if (this.mode === 'create')
        apiCollection
          .create(this.dbName, this.collection)
          .then(newCollection => this.$emit('submit', newCollection))
      else if (this.mode === 'update')
        apiCollection
          .update(this.dbName, this.collection.name, this.collection)
          .then(newCollection => this.$emit('submit', newCollection))
    },
    open(mode, dbName, collection) {
      this.mode = mode
      this.dbName = dbName
      if (mode === 'update') Object.assign(this.collection, collection)
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
