<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <el-form ref="form" :model="collection" label-position="top">
      <el-form-item label="文档名称（英文）">
        <el-input v-model="collection.name"></el-input>
      </el-form-item>
      <el-form-item label="文档显示名（中文）">
        <el-input v-model="collection.title"></el-input>
      </el-form-item>
      <el-form-item label="文档列定义">
        <el-select v-model="collection.schema_id" clearable placeholder="请选择">
          <el-option v-for="item in schemas" :key="item._id" :label="item.title" :value="item._id">
          </el-option>
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

export default {
  name: 'CollectionEditor',
  props: {
    dialogVisible: { default: true },
    bucketName: { type: String },
    dbName: { type: String },
    collection: {
      type: Object,
      default: function() {
        return { name: '', title: '', description: '', schema_id: '' }
      }
    }
  },
  data() {
    return {
      mode: '',
      destroyOnClose: true,
      closeOnClickModal: false,
      schemas: []
    }
  },
  mounted() {
    apiSchema.listSimple(this.bucketName).then(schemas => {
      this.schemas = schemas
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
