<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <el-tabs v-model="activeTab" type="card" @tab-click="onTabClick">
      <el-tab-pane label="基本信息" name="first"></el-tab-pane>
      <el-tab-pane label="列定义" name="second"></el-tab-pane>
    </el-tabs>
    <el-form v-show="activeTab === 'first'" :model="schema" label-position="top">
      <el-form-item :label="showName">
        <el-input v-model="schema.title"></el-input>
      </el-form-item>
      <el-form-item label="类型" v-if="showRadio">
        <el-radio v-model="schema.scope" label="db">数据库</el-radio >
        <el-radio v-model="schema.scope" label="collection">文档</el-radio >
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
import { JsonSchema as TmsJsonSchema } from 'tms-vue-ui'
import apiSchema from '../apis/schema'

export default {
  name: 'SchemaEditor',
  components: { TmsJsonSchema },
  props: {
    dialogVisible: { default: true },
    schema: {
      type: Object,
      default: function() {
        return { title: '', description: '', scope: 'db', body: {} }
      }
    }
  },
  data() {
    return {
      activeTab: 'first',
      destroyOnClose: true,
      closeOnClickModal: false,
      type: ''
    }
  },
  computed: {
    showName() {
      return this.type === 'schema' ? '集合列定义显示名（中文）' : this.type === 'attribute' ? '库文档属性定义显示名（中文）' : ''
    },
    showRadio() {
      return this.type === 'schema' ? false : this.type === 'attribute' ? true : ''
    }
  },
  methods: {
    onTabClick() {},
    onSubmit() {
      if (this.schema && this.schema._id) {
        apiSchema
          .update(this.schema, this.schema)
          .then(newSchema => this.$emit('submit', {...newSchema, _id: this.schema._id}))
      } else {
        if (!this.showRadio) delete this.schema.scope
        apiSchema
          .create(this.schema)
          .then(newSchema => this.$emit('submit', newSchema))
      }
    },
    open(schema, type, isCopy) {
      this.type = type
      if ((schema && schema._id) || isCopy) Object.assign(this.schema, schema)
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', schema => {
          this.dialogVisible = false
          resolve(schema)
        })
      })
    }
  }
}
</script>
