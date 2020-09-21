<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <el-form ref="form" :model="tag" label-position="top">
      <el-form-item label="标签名">
        <el-input v-model="tag.name"></el-input>
      </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </div>
  </el-dialog>
</template>
<script>
import apiTag from '../apis/tag'

export default {
  name: 'TagEditor',
  props: {
    dialogVisible: { default: true },
    bucketName: { type: String },
    tag: {
      type: Object,
      default: function() {
        return { name: '' }
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
        apiTag
          .update(this.bucketName, this.tag)
          .then(newTag => this.$emit('submit', newTag))
      } else if (this.mode === 'create') {
        apiTag
          .create(this.bucketName, this.tag)
          .then(newTag => this.$emit('submit', newTag))
      }
    },
    open(mode, bucketName, tag) {
      this.mode = mode
      this.bucketName = bucketName
      if (mode === 'update') {
        Object.assign(this.tag, tag)
      }
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', newTag => {
          this.dialogVisible = false
          resolve(newTag)
        })
      })
    }
  }
}
</script>
