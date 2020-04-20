<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <el-form ref="form" :model="bucket" label-position="top">
      <el-form-item label="ID（英文字符）">
        <el-input v-model="bucket.name"></el-input>
      </el-form-item>
      <el-form-item label="存储空间显示名">
        <el-input v-model="bucket.title"></el-input>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="bucket.description"></el-input>
      </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </div>
  </el-dialog>
</template>
<script>
import apiDkt from '../apis/bucket'

export default {
  name: 'DucketEditor',
  props: {
    dialogVisible: { default: true },
    bucket: {
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
      if (this.mode === 'update') {
        apiDkt
          .update(this.bucket.name, this.bucket)
          .then(newBucket => this.$emit('submit', newBucket))
      } else if (this.mode === 'create') {
        apiDkt
          .create(this.bucket)
          .then(newBucket => this.$emit('submit', newBucket))
      }
    },
    open(mode, bucket) {
      this.mode = mode
      if (mode === 'update') Object.assign(this.bucket, bucket)
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', newBucket => {
          this.dialogVisible = false
          resolve(newBucket)
        })
      })
    }
  }
}
</script>
