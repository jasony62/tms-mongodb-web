<!-- <template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="基本信息" name="first"></el-tab-pane>
      <el-tab-pane label="列定义" name="second"></el-tab-pane>
    </el-tabs>
    <el-form v-show="activeTab === 'first'" :model="schema" label-position="top">
      <el-form-item label="显示名（中文）">
        <el-input v-model="schema.title"></el-input>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="schema.description"></el-input>
      </el-form-item>
      <el-form-item label="标签">
        <el-select v-model="schema.tags" multiple clearable placeholder="请选择">
          <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
        </el-select>
      </el-form-item>
    </el-form>
    <tms-json-schema v-show="activeTab === 'second'" :schema="schema.body" :extendSchema="extendSchema"
      :on-upload="onUploadFile" class="schema-editor">
      <template v-slot:extKeywords="props">
        <el-form-item label="不可修改">
          <el-switch v-model="props.schema.readonly"></el-switch>
        </el-form-item>
      </template>
    </tms-json-schema>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="dialogVisible2 = false">取消</el-button>
    </div>
  </el-dialog>
</template>
<script setup lang="ts">
import { JsonSchema as TmsJsonSchema } from 'tms-vue3-ui'
import apiSchema from '../apis/schema'
import apiTag from '../apis/tag'
import apiDoc from '../apis/document'
import { onMounted, ref } from 'vue'

const emit = defineEmits(['submit'])

const props = defineProps({
  dialogVisible: { default: true },
  bucketName: { type: String },
  schema: {
    type: Object,
    default: function () {
      return { title: '', description: '', scope: '', tags: [], body: {} }
    }
  }
})

const dialogVisible2 = ref(props.dialogVisible)

const activeTab = ref('first')
const tags = ref([])
const destroyOnClose = ref(true)
const closeOnClickModal = ref(false)

const extendSchema = (vm, schema) => {
  vm.$set(schema, 'readonly', schema.readonly || false)
}

onMounted(() => {
  apiTag.list(props.bucketName).then((tags: any) => {
    tags.value = tags
  })
})

const onUploadFile = (file: any) => {
  let fileData = new FormData()
  fileData.append('file', file)
  const config = { 'Content-Type': 'multipart/form-data' }
  return apiDoc
    .upload({ bucket: props.bucketName }, fileData, config)
    .then((uploadUrl: any) => {
      return { name: file.name, url: uploadUrl }
    })
    .catch((error: any) => {
      throw error
    })
}
const onSubmit = () => {
  let sm = props.schema
  if (sm._id) {
    apiSchema
      .update(props.bucketName, sm, sm)
      .then((newSchema: any) =>
        emit('submit', { ...newSchema, _id: sm._id })
      )
  } else {
    apiSchema
      .create(props.bucketName, sm)
      .then((newSchema: any) => emit('submit', newSchema))
  }
}
  // open(schema, bucketName) {
  //   this.bucketName = bucketName
  //   Object.assign(this.schema, schema)
  //   this.$mount()
  //   document.body.appendChild(this.$el)
  //   return new Promise(resolve => {
  //     this.$on('submit', schema => {
  //       this.dialogVisible = false
  //       resolve(schema)
  //     })
  //   })
  // }
</script> -->
<template></template>
