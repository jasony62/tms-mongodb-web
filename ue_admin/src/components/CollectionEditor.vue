<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <el-form ref="form" :model="collection" label-position="top">
      <el-form-item label="集合名称（英文）">
        <el-input v-model="collection.name"></el-input>
      </el-form-item>
      <el-form-item label="集合显示名（中文）">
        <el-input v-model="collection.title"></el-input>
      </el-form-item>
      <el-form-item label="集合用途">
        <el-select v-model="collection.usage" clearable placeholder="请选择集合用途">
          <el-option v-for="(i, k) in usages" :key="k" :label="i.label" :value="i.value"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="集合文档内容定义（默认）">
        <el-select v-model="collection.schema_id" clearable placeholder="请选择定义的名称">
          <el-option v-for="item in schemas" :key="item._id" :label="item.title" :value="item._id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="集合文档内容定义（定制）">
        <el-select v-model="collection.tags" clearable multiple placeholder="请选择定义的标签">
          <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="默认展示（定制）">
        <el-select v-model="collection.default_tag" clearable multiple placeholder="请选择定义的标签">
          <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
        </el-select>
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
import apiCollection from '../apis/collection'
import apiSchema from '../apis/schema'
import apiTag from '../apis/tag'

export default {
  name: 'CollectionEditor',
  props: {
    dialogVisible: { default: true },
    bucketName: { type: String },
    dbName: { type: String },
    collection: {
      type: Object,
      default: function() {
        return {
          name: '',
          title: '',
          description: '',
          schema_id: '',
          tags: [],
          default_tag: []
        }
      }
    }
  },
  data() {
    return {
      mode: '',
      destroyOnClose: true,
      closeOnClickModal: false,
      schemas: [],
      tags: [],
      usages: [
        { value: 0, label: '普通集合' },
        { value: 1, label: '从集合' }
      ]
    }
  },
  mounted() {
    apiSchema.listSimple(this.bucketName).then(schemas => {
      this.schemas = schemas
    })
    apiTag.list(this.bucketName).then(tags => {
      this.tags = tags
    })
  },
  methods: {
    onSubmit() {
      if (this.mode === 'create')
        apiCollection
          .create(this.bucketName, this.dbName, this.collection)
          .then(newCollection => this.$emit('submit', newCollection))
      else if (this.mode === 'update')
        apiCollection
          .update(
            this.bucketName,
            this.dbName,
            this.collection.fromDatabase,
            this.collection
          )
          .then(newCollection => this.$emit('submit', newCollection))
    },
    open(mode, bucketName, dbName, collection) {
      this.mode = mode
      this.bucketName = bucketName
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
