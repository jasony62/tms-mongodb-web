<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <tms-el-json-doc :is-submit="isSubmit" :schema="schema" :doc="formData" :on-axios="onAxios" :on-file-download="onFileDownload" :on-file-submit="handleFileSubmit" @submit="onJsonDocSubmit"></tms-el-json-doc>
  </el-dialog>
</template>
<script>
import { Dialog, Button } from 'element-ui'
import { ElJsonDoc as TmsElJsonDoc } from 'tms-vue-ui'
import utils from '../../../ue_mongo/src/tms/utils'

// 创建api调用对象方法
let fnCreateDocApi

const {
  VUE_APP_FRONT_DOCEDITOR_ADD,
  VUE_APP_FRONT_DOCEDITOR_MODIFY
} = process.env

const ComponentOptions = {
  name: 'DialogSchemaForm',
  components: {
    'el-dialog': Dialog,
    'el-button': Button,
    'tms-el-json-doc': TmsElJsonDoc
  },
  props: {
    schema: Object,
    formData: Object,
    tmsAxiosName: String
  },
  data() {
    return {
      dialogVisible: true,
      destroyOnClose: true,
      closeOnClickModal: false,
      plugins: [],
      isSubmit: false
    }
  },
  methods: {
    /**表单内发起请求 */
    onAxios() {
      return this.TmsAxios(this.tmsAxiosName)
    },
    /**表单内文件下载 */
    onFileDownload(name, url) {
      /**需要访问控制 */
      if (process.env.VUE_APP_BACK_AUTH_BASE) {
        const accessToken = this.$getToken()
        window.open(`${url}?access_token=${accessToken}`)
      } else {
        window.open(`${url}`)
      }
    },
    /**提交表单前，先上传表单中文件 */
    handleFileSubmit(schemaKey, files) {
      let result = {}
      let promises = files.map(file => {
        if (file.hasOwnProperty('url')) {
          return { name: file.name, url: file.url }
        }
        const fileData = new FormData()
        fileData.append('file', file)
        const config = { 'Content-Type': 'multipart/form-data' }
        return fnCreateDocApi(this.TmsAxios(this.tmsAxiosName))
          .upload({ bucket: this.bucketName }, fileData, config)
          .then(path => {
            return Promise.resolve({ url: path, name: file.name })
          })
      })
      return Promise.all(promises).then(files => {
        result[schemaKey] = files
        return Promise.resolve(result)
      })
    },
    /**提交表单 */
    onJsonDocSubmit() {
      this.isSubmit = true
      let validate = true
      if (this.plugins.length) {
        validate = this.plugins
          .map(item => {
            const result = utils[item](this.schema, this.formData)
            if (result.msg === 'success') {
              this.formData = result.data
              return true
            } else {
              return false
            }
          })
          .every(ele => ele === true)
      }
      if (!validate) {
        this.isSubmit = false
        return false
      }
      this.$emit('confirm', this.formData)
      this.$destroy()
    }
  },
  mounted() {
    if (VUE_APP_FRONT_DOCEDITOR_ADD) {
      let str = VUE_APP_FRONT_DOCEDITOR_ADD.replace(/\s/g, '')
      this.plugins = str.split(',')
    }
    if (Object.keys(this.formData).length !== 0) {
      if (VUE_APP_FRONT_DOCEDITOR_MODIFY) {
        let str = VUE_APP_FRONT_DOCEDITOR_MODIFY.replace(/\s/g, '')
        this.plugins = str.split(',')
      }
    }
    document.body.appendChild(this.$el)
  },
  beforeDestroy() {
    document.body.removeChild(this.$el)
  }
}
export default ComponentOptions
/**
 * 支持作为独立组件加载
 */
export function createAndMount(Vue, propsData, apiCreators) {
  // 只有指定了数据库时才能指定集合
  if (!propsData.schemas && propsData.schemas) propsData.schemas = {}

  if (!propsData.formData || Object.keys(propsData.formData).length === 0) {
    propsData.formData = {}
  }

  fnCreateDocApi = apiCreators.createDocApi

  const CompClass = Vue.extend(ComponentOptions)
  return new CompClass({
    propsData
  }).$mount()
}
</script>
<style lang="less" scoped>
.el-dialog__wrapper {
  /deep/ .el-dialog {
    width: 60%;
  }
  /deep/ .el-dialog__body {
    height: 60vh;
    padding-bottom: 0;
    .el-select {
      .el-input {
        width: 100%;
      }
    }
  }
}
</style>