<template>
  <el-dialog :title="title" v-model="dialogVisible" :fullscreen="true" :destroy-on-close="true"
    :close-on-click-modal="false" :before-close="onBeforeClose">
    <div class="h-full flex flex-col">
      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="基本信息" name="first"></el-tab-pane>
        <el-tab-pane label="列定义" name="second"></el-tab-pane>
      </el-tabs>
      <div class="overflow-auto flex-grow">
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
        <div v-show="activeTab === 'second'" class="flex flex-row gap-4 h-full overflow-auto">
          <tms-json-schema ref="$jse" :schema="schema.body" :root-name="'$'" :on-upload="onUploadFile"
            class="h-full overflow-auto">
            <template #extattrs="{ attrs }">
              <el-form-item label="不可修改">
                <el-switch v-model="attrs.readonly"></el-switch>
              </el-form-item>
              <el-form-item label="可全文检索">
                <el-switch v-model="attrs.fulltextSearch"></el-switch>
              </el-form-item>
            </template>
          </tms-json-schema>
          <div class="h-full flex-grow flex flex-col gap-2 relative" style="max-width:50%;">
            <div class="absolute top-0 right-0">
              <el-button @click="preview">预览</el-button>
              <el-tooltip effect="dark" content="复制" placement="bottom" :visible="copyTooltipVisible">
                <el-button @click="copy" :disabled="!previewResult">复制</el-button>
              </el-tooltip>
            </div>
            <div class="border-2 border-gray-300 rounded-md p-2 h-full w-full overflow-auto">
              <pre>{{ previewResult }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="onSubmit">{{ submitTitle }}</el-button>
      <el-button @click="onBeforeClose">取消</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import apiSchema from '@/apis/schema'
import apiTag from '@/apis/tag'
import apiDoc from '@/apis/document'
import { computed, onMounted, reactive, ref } from 'vue'
import useClipboard from 'vue-clipboard3'

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

const submitTitle = computed(() => {
  return schema._id ? '修改' : '新建'
})

const title = computed(() => {
  let t = schema.scope === 'document' ? '文档内容定义' : (schema.scope === 'db' ? '数据库属性定义' : '集合属性定义')
  t += '-' + (schema._id ? '修改' : '新建')
  return t
})
const activeTab = ref('first')
const tags = ref([] as any[])

const previewResult = ref('')

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

const preview = () => {
  previewResult.value = JSON.stringify($jse.value?.editing(), null, 2)
}

const { toClipboard } = useClipboard()

const copyTooltipVisible = ref(false)

const copy = async () => {
  try {
    await toClipboard(previewResult.value)
    copyTooltipVisible.value = true
    setTimeout(() => { copyTooltipVisible.value = false }, 1000)
  } catch (e) { }
}

const onSubmit = () => {
  let newBody = $jse.value?.editing()
  if (newBody)
    Object.assign(schema.body, newBody)

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

}
</style>
