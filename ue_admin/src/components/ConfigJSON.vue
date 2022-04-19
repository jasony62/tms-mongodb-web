<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal" v-if="dialogVisible">
    <div id="jsonEditor" style="height:100%"></div>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </div>
  </el-dialog>
</template>

<script>
import JSONEditor from 'jsoneditor'
import 'jsoneditor/dist/jsoneditor.css'

let editor = null
export default {
  name: 'ConfigJSON',
  components: {
    JSONEditor,
  },
  props: {
    dialogVisible: { type: Boolean, default: true },
    jsonData: { type: Object },
  },
  data() {
    return {
      destroyOnClose: true,
      closeOnClickModal: false,
      options: {
        mode: 'code',
        search: false,
        transform: false,
      },
    }
  },
  mounted() {
    this.$nextTick(() => {
      const container = document.getElementById('jsonEditor')
      editor = new JSONEditor(container, this.options)
      editor.set(this.jsonData)
    })
  },

  methods: {
    onSubmit() {
      this.jsonData = editor.get()
      this.$emit('submit', this.jsonData)
    },
    open(data) {
      this.jsonData = JSON.parse(JSON.stringify(data))
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise((resolve) => {
        this.$on('submit', (newValue) => {
          this.dialogVisible = false
          resolve(newValue)
        })
      })
    },
  },
}
</script>

<style>
.jsoneditor .jsoneditor-transform,
.jsoneditor .jsoneditor-repair,
.jsoneditor .jsoneditor-poweredBy {
  display: none;
}
</style>
