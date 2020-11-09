<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <el-input
      placeholder="自定义选中列的值，不填则值为空"
      v-model="input"
      class="input-with-select"
    >
      <el-select
        v-model="select"
        slot="prepend"
        placeholder="选择列"
        @change="handleSelect"
        clearable
        filterable
      >
        <el-option
          v-for="(s, k) in collection.schema.body.properties"
          :key="k"
          :prop="k"
          :label="s.title"
          :value="k"
        ></el-option>
      </el-select>
    </el-input>
    <div
      style="margin:10px 0"
      v-if="
        select &&
          collection.schema.body.properties[select].type === 'string' &&
          collection.schema.body.properties[select].hasOwnProperty('enum')
      "
    >
      <span>请选择以下文字中的内容，填入输入框内： </span>
      <span
        style="margin-right:20px"
        v-for="(s, k) in collection.schema.body.properties[select].enum"
        :key="k"
        >{{ s.label }}</span
      >
    </div>
    <div class="tmw-tags">
      <el-tag
        v-for="tag in tags"
        :key="tag.id"
        closable
        :disable-transitions="false"
        @close="removeTag(tag)"
        >{{ tag.label }}:{{ tag.value }}</el-tag
      >
    </div>
    <div slot="footer" class="dialog-footer">
      <el-button type="success" @click="handleButton">添加</el-button>
      <el-button type="primary" @click="onSubmit">提交</el-button>
    </div>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Dialog, Input, Select, Option, Button, Tag, Message } from 'element-ui'
Vue.use(Dialog)
  .use(Input)
  .use(Select)
  .use(Option)
  .use(Button)
  .use(Tag)

export default {
  name: 'ColumnValueEditor',
  props: {
    dialogVisible: { default: true }
  },
  data() {
    return {
      destroyOnClose: true,
      closeOnClickModal: false,
      collection: {},
      select: '',
      input: '',
      column: {},
      tags: []
    }
  },
  watch: {
    // 多选暂不支持批量删除，故除之
    collection() {
      for (const key in this.collection.schema.body.properties) {
        if (
          this.collection.schema.body.properties[key].type === 'array' &&
          this.collection.schema.body.properties[key].enum
        ) {
          delete this.collection.schema.body.properties[key]
        }
      }
      this.$forceUpdate()
    }
  },
  methods: {
    handleSelect() {
      let value = this.column[this.select]
      this.input = value ? value : ''
    },
    handleButton() {
      if (!this.select) {
        Message.info({ message: '请选择条件' })
        return false
      }
      this.$set(this.column, this.select, this.input.replace(/^\s+|\s+$/g, ''))
      if (this.tags.length) {
        this.tags.forEach(tag => {
          if (tag && tag.id === this.select) {
            tag.value = this.input
          }
        })
        if (this.tags.every(ele => ele.id !== this.select)) {
          this.addColumn()
        }
      } else {
        this.addColumn()
      }
    },
    addColumn() {
      this.tags.push({
        id: this.select,
        label: this.collection.schema.body.properties[this.select].title,
        value: this.input
      })
      this.select = ''
      this.input = ''
    },
    removeTag(tag) {
      this.tags.forEach((item, index) => {
        if (item.id === tag.id) {
          this.tags.splice(index, 1)
          if (this.select === tag.id) {
            this.select = ''
            this.input = ''
          }
          delete this.column[tag.id]
        }
      })
    },
    async onSubmit() {
      let validate = true
      if (validate) {
        const properties = this.collection.schema.body.properties
        for (let [key, val] of Object.entries(this.column)) {
          if (
            properties[key].type === 'string' &&
            properties[key].hasOwnProperty('enum')
          ) {
            let values = properties[key].enum.map(item => item.label)
            if (val !== '' && !values.includes(val)) {
              Message.info({
                message: '请输入“' + properties[key].title + '”列正确的选值'
              })
              return false
            }
            properties[key].enum.forEach(item => {
              if (item.label == val) this.column[key] = item.value
            })
          }
        }
        this.$emit('submit', this.column)
      }
    },
    open(collection) {
      this.collection = JSON.parse(
        JSON.stringify(Object.assign(this.collection, collection))
      )
      Object.entries(this.collection.schema.body.properties).forEach(
        ([key, value]) => {
          switch (value.type) {
            case 'array':
              if ((value.items && value.items.format === 'file') || value.enum)
                delete this.collection.schema.body.properties[key]
              break
            case 'string':
              if (value.readonly === true)
                delete this.collection.schema.body.properties[key]
              break
          }
        }
      )
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
