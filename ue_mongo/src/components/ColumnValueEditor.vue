<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <el-input placeholder="请输入内容" v-model="input" class="input-with-select">
      <el-select v-model="select" slot="prepend" placeholder="选择条件" @change="handleSelect">
        <el-option v-for="(s, k) in collection.schema.body.properties" :key="k" :prop="k" :label="s.title" :value="k"></el-option>
      </el-select>
      <el-button slot="append" icon="el-icon-plus" @click="handleButton"></el-button>
    </el-input>
    <div class="tmw-tags">
      <el-tag v-for="tag in tags" :key="tag.id" closable :disable-transitions="false" @close="removeTag(tag)">{{tag.label}}:{{tag.value}}</el-tag>
    </div>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </div>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Dialog, Message } from 'element-ui'
Vue.use(Dialog)
Vue.prototype.$message = Message

import apiDoc from '../apis/document'

export default {
  name: 'ColumnValueEditor',
  props: {
    dialogVisible: { default: true }
  },
  data() {
    return {
      destroyOnClose: true,
      closeOnClickModal: false,
      dbName: '',
      collection: null,
      select: "",
      input: "",
      column: {},
      tags: []
    }
  },
  methods: {
    handleSelect() {
      let value = this.column[this.select]
      this.input = value ? value : ""
    },
    handleButton() {
      if (!this.select || !this.input) {
        Message.info({ message: '请确认是否选择条件或输入关键词'})
        return false
      }
      this.$set(this.column, this.select, this.input.replace(/^\s+|\s+$/g,""))
      if (this.tags.length) {
        this.tags.forEach(tag => {
          if (tag && tag.id===this.select) {
            tag.value = this.input
          } 
        })
        if (this.tags.every(ele => ele.id !== this.select)) {
          this.addColumn();
        }
      } else {
        this.addColumn();
      }
    },
    addColumn() {
      this.tags.push({
        id: this.select,
        label: this.collection.schema.body.properties[this.select].title,
        value: this.input
      })
    },
    removeTag(tag) {
      this.tags.forEach((item, index) => {
        if (item.id===tag.id) {
          this.tags.splice(index, 1)
          if (this.select===tag.id) {
            this.select = ""
            this.input = ""
          }
          delete this.column[tag.id]
        }
      })
    },
    onSubmit() {
      apiDoc
        .batchUpdate(this.dbName, this.collection.name, {'columns': this.column})
        .then(result => this.$emit('submit', result))
    },
    open(dbName, collection) {
      this.dbName = dbName
      this.collection = collection
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', result => {
          this.dialogVisible = false
          resolve(result)
        })
      })
    }
  }
}
</script>
<style lang="css">
@import "../assets/css/common.css"
</style>
