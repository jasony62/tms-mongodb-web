<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
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
      destroyOnClose: true,
      closeOnClickModal: false
    }
  },
  methods: {
    onSubmit() {
      if (this.mode === 'update') {
        apiDb
          .update(this.database.name, this.database)
          .then(newDb => this.$emit('submit', newDb))
      } else if (this.mode === 'create') {
        apiDb.create(this.database).then(newDb => this.$emit('submit', newDb))
      }
    },
    open(mode, db) {
      this.mode = mode
      if (mode === 'update') Object.assign(this.database, db)
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
