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
        <el-select v-model="columnVal" placeholder="请选择">
          <el-option v-for="options in options" :key="options.value" :label="options.label" :value="options.value">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="列值" v-else>
        <div>暂不支持修改此类型的值</div>
      </el-form-item>
    </el-form>
    <div class="tmw-tags">
      <el-tag v-for="tag in tags" :key="tag.id" :disable-transitions="false" @close="removeTag(tag)" closable>{{tag.label}}:{{tag.value}}</el-tag>
    </div>
    <div slot="footer" class="dialog-footer">
      <el-button type="success" @click="addColumn">添加</el-button>
      <el-button type="primary" @click="onSubmit">提交</el-button>
    </div>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Dialog, Form, FormItem, Input, Select, Option, Tag, Button } from 'element-ui'
Vue.use(Dialog)
  .use(Form)
  .use(FormItem)
  .use(Input)
  .use(Select)
  .use(Option)
  .use(Tag)
  .use(Button)

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
      tags: []
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
      if (this.type==='text') {
        this.columnVal = this.columnVal.replace(/^\s+|\s+$/g,"")
      }
      this.$set(this.column, this.columnKey, this.columnVal)
      /* this.columnKey = ""
      this.columnVal = "" */
      this.addTag()
    },
    removeColumn(id) {
      delete this.column[id]
    },
    addTag() {
      let currentTag = {
        id: this.columnKey,
        label: this.properties[this.columnKey].title
      }
      if ()
      this.tags.push(currentTag)
    },
    removeTag(tag) {
      this.tags.forEach((item, index) => {
        if (item.id===tag.id) {
          this.tags.splice(index, 1)
          if (this.columnKey===tag.id) {
            this.columnKey = ""
            this.columnVal = ""
          }
          this.removeColumn(tag.id)
        }
      })
    },
    /* 
    handleButton() {
      if (!this.select) {
        Message.info({ message: '请选择条件'})
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
     */
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
