<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <el-form label-width="80px">
      <el-form-item label="列名">
        <el-select v-model="columnKey" placeholder="选择列" @change="handleSelect">
          <el-option v-for="(s, k) in properties" :key="k" :label="s.title" :value="k">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="列值" v-if="type=='text'">
        <el-input v-model="columnVal" placeholder="请输入内容,默认为空" clearable></el-input>
      </el-form-item>
      <el-form-item label="列值" v-else-if="type=='multiple'">
        <el-select v-model="columnVal" placeholder="请选择" multiple>
          <el-option v-for="option in options" :key="option.value" :label="option.label" :value="option.value">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="列值" v-else-if="type=='single'">
        <el-radio-group v-model="columnVal">
          <el-radio v-for="option in options" :key="option.value" :label="option.value">{{option.label}}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="列值" v-else>
        <div>暂不支持修改此类型的值</div>
      </el-form-item>
    </el-form>
    <div class="tmw-tags">
      <el-tag v-for="(tag, key) in tags" :key="tag.id" :disable-transitions="false" @close="removeTag(key)" closable>{{tag.label}}:{{tag.value}}</el-tag>
    </div>
    <div slot="footer" class="dialog-footer">
      <el-button type="success" @click="addColumn">添加</el-button>
      <el-button type="primary" @click="onSubmit">提交</el-button>
    </div>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Dialog, Form, FormItem, Input, Select, Option, Tag, Button, Message, Radio, RadioGroup } from 'element-ui'
Vue.use(Dialog)
  .use(Form)
  .use(FormItem)
  .use(Input)
  .use(Select)
  .use(Option)
  .use(Tag)
  .use(Button)
  .use(Radio)
  .use(RadioGroup)

export default {
  props: {
    dialogVisible: { default: true }
  },
  data() {
    return {
      destroyOnClose: true,
      closeOnClickModal: false,
      properties: {},
      columnKey: "",
      columnVal: "",
      type: "",
      column: {},
      tags: {}
    }
  },
  watch: {
    columnKey: function(newVal) {
      if (!newVal) return
      const config = this.properties[this.columnKey]
      switch(config.type) {
        case 'array':
          this.type = config.hasOwnProperty('enum') ? 'multiple' : 'file'
          break
        case 'string':
          this.type = config.hasOwnProperty('enum') ? 'single' : 'text'
          break
        default:
          this.type = config.type
      }
      if (config.enum) this.options = config.enum
    }
  },
  methods: {
    handleSelect() {
      let value = this.column[this.columnKey]
      this.columnVal = value ? value : ""
    },
    addColumn() {
      if (this.columnKey==='') {
        Message.info({ message: '请选择修改的列'})
        return false
      }
      if (this.type==='text') {
        this.columnVal = this.columnVal.replace(/^\s+|\s+$/g,"")
      }
      this.$set(this.column, this.columnKey, this.columnVal)
      this.addTag()
    },
    removeColumn(id) {
      delete this.column[id]
    },
    getValues(columnVal, enums) {
      let labels = []
      enums.forEach(item => {
        if (columnVal.includes(item.value)) {
          labels.push(item.label)
        }
      }) 
      return labels.join(',')
    },
    addTag() {
      const config = this.properties[this.columnKey]
      let currentTag = {
        label: config.title
      }
      currentTag.value = config.hasOwnProperty('enum') ? this.getValues(this.columnVal, config.enum) : this.columnVal
      this.$set(this.tags, this.columnKey, currentTag)
    },
    removeTag(tag) {
      this.$delete(this.tags, tag)
      this.removeColumn(tag)
      this.columnKey = ""
      this.columnVal = ""
    },
    onSubmit() {
      this.$emit('submit', this.column)
    },
    open(collection) {
      this.properties = collection.schema.body.properties
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', column => {
          this.dialogVisible = false
          resolve(column)
        })
      })
    }
  }
}
</script>
