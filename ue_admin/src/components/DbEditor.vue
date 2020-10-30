<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <el-form ref="form" :model="database" label-position="top">
      <el-form-item label="数据库名称（英文）">
        <el-input v-model="database.name"></el-input>
      </el-form-item>
      <el-form-item label="数据库显示名（中文）">
        <el-input v-model="database.title"></el-input>
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
import apiDb from '../apis/database'

export default {
  name: 'DbEditor',
  props: {
    dialogVisible: { default: true },
    bucketName: { type: String },
    database: {
      type: Object,
      default: function() {
        return { name: '', title: '', description: '' }
      }
    }
  },
  data() {
    return {
      mode: '',
      oldDbName: '',
      destroyOnClose: true,
      closeOnClickModal: false
    }
  },
  methods: {
    onSubmit() {
      const reg = /^[a-zA-z]/
      if (!reg.test(this.database.name)) {
        return this.$message.error('请输入以英文字母开头的库名')
      }
      if (this.mode === 'update') {
        apiDb
          .update(this.bucketName, this.oldDbName, this.database)
          .then(newDb => this.$emit('submit', newDb))
      } else if (this.mode === 'create') {
        apiDb
          .create(this.bucketName, this.database)
          .then(newDb => this.$emit('submit', newDb))
      }
    },
    open(mode, bucketName, db) {
      this.mode = mode
      this.bucketName = bucketName
      if (mode === 'update') {
        Object.assign(this.database, db)
        this.oldDbName = this.database.name
      }
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
