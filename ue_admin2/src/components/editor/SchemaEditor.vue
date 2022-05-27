<template>
  <el-dialog title="文档内容定义" v-model="dialogVisible" :fullscreen="true" :destroy-on-close="true"
    :close-on-click-modal="false" :before-close="onBeforeClose">
    <div class="editor">
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
      <tms-json-schema ref="$jse" v-show="activeTab === 'second'" :schema="schema.body" :root-name="'$'"
        :on-upload="onUploadFile" class="schema-editor">
        <template #extattrs="{ attrs }">
          <el-form-item label="不可修改">
            <el-switch v-model="attrs.readonly"></el-switch>
          </el-form-item>
        </template>
      </tms-json-schema>
    </div>
    <template #footer>
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onBeforeClose">取消</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import apiSchema from '@/apis/schema'
import apiTag from '@/apis/tag'
import apiDoc from '@/apis/document'
import { onMounted, reactive, ref } from 'vue'

const emit = defineEmits(['submit'])

// JSONSchema编辑器
const $jse = ref(null as unknown as { editing: () => any })

const props = defineProps({
  dialogVisible: { default: true },
  bucketName: { type: String },
  schema: {
    type: Object,
    default() {
      return { title: '', description: '', scope: '', tags: [], body: {} }
    }
  },
  onClose: { type: Function, default: (newSchema: any) => { } }
})

const dialogVisible = ref(props.dialogVisible)
const schema = reactive(props.schema)
const { onClose, bucketName } = props

const activeTab = ref('first')
const tags = ref([])

// 关闭对话框时执行指定的回调方法
const closeDialog = (newSchema?: any) => {
  onClose(newSchema)
}

// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog(null)
}

onMounted(() => {
  apiTag.list(bucketName).then((tags: any) => {
    tags.value = tags
  })
})

const onUploadFile = (file: any) => {
  let fileData = new FormData()
  fileData.append('file', file)
  const config = { 'Content-Type': 'multipart/form-data' }
  return apiDoc
    .upload({ bucket: bucketName }, fileData, config)
    .then((uploadUrl: any) => {
      return { name: file.name, url: uploadUrl }
    })
    .catch((error: any) => {
      throw error
    })
}

const onSubmit = () => {
  let newBody = $jse.value?.editing()
  if (newBody) {
    schema.body = newBody
  }
  if (schema._id) {
    apiSchema
      .update(bucketName, schema, schema)
      .then((newSchema: any) => {
        emit('submit', { ...newSchema, _id: schema._id })
        closeDialog(newSchema)
      })
  } else {
    apiSchema
      .create(bucketName, schema)
      .then((newSchema: any) => {
        emit('submit', newSchema)
        closeDialog(newSchema)
      })
  }
}
</script>

<style lang="scss">
#schemaEditor {

  .el-dialog.is-fullscreen {
    @apply flex flex-col;

    .el-dialog__body {
      @apply flex-grow overflow-auto;
    }
  }

  .editor {
    height: 100%;
  }
}
</style>
