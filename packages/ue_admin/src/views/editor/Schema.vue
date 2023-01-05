<template>
  <div id="schemaEditor">
    <div class="h-12 py-4 px-2">
      <el-breadcrumb :separator-icon="ArrowRight">
        <el-breadcrumb-item :to="{ name: 'databaseDocSchemas' }" v-if="dbName">文档字段定义</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'docSchemas' }" v-else>文档字段定义</el-breadcrumb-item>
        <el-breadcrumb-item>{{ title }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="p-2 border-t border-b border-gray-200 mb-2 text-center">
      <el-button type="primary" @click="onSubmit">{{ submitTitle }}</el-button>
    </div>
    <div class="flex-1 mb-4 flex flex-row overflow-hidden">
      <el-tabs tab-position="left" v-model="activeTab" class="h-full flex-shrink-0">
        <el-tab-pane label="基本信息" name="first"></el-tab-pane>
        <el-tab-pane label="列定义" name="second"></el-tab-pane>
      </el-tabs>
      <div class="overflow-auto flex-grow h-full">
        <el-form v-show="activeTab === 'first'" :model="schema" label-position="top" class="w-1/3">
          <el-form-item label="列定义名称（英文）" prop="name">
            <el-input v-model="schema.name"></el-input>
          </el-form-item>
          <el-form-item label="显示名（中文）【由列定义中的根节点标题自动填充】">
            <el-input v-model="schema.title" :disabled="true"></el-input>
          </el-form-item>
          <el-form-item label="说明">
            <el-input type="textarea" v-model="schema.description" :disabled="true"></el-input>
          </el-form-item>
          <el-form-item label="顺序号">
            <el-input-number v-model="schema.order"></el-input-number>
          </el-form-item>
          <el-form-item label="父定义名称">
            <el-input v-model="schema.parentName"></el-input>
          </el-form-item>
          <el-form-item label="标签">
            <el-select v-model="schema.tags" multiple clearable placeholder="请选择">
              <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
            </el-select>
          </el-form-item>
        </el-form>
        <div v-if="activeTab === 'second'" class="flex flex-row gap-4 h-full overflow-auto">
          <tms-json-schema class="h-full w-1/2 overflow-auto" ref="$jse" :schema="schema.body" :root-name="'$'"
            :on-upload="onUploadFile" :on-message="onMessage" :on-paste="onPasteSchema">
            <template #extattrs="{ attrs }">
              <el-form-item label="不可修改">
                <el-switch v-model="attrs.readonly"></el-switch>
              </el-form-item>
            </template>
          </tms-json-schema>
          <div class="h-full w-1/2 flex flex-col gap-2 relative">
            <div class="absolute top-0 right-0">
              <el-button @click="preview">预览</el-button>
              <el-tooltip effect="dark" content="复制" placement="bottom" :visible="copyTooltipVisible">
                <el-button @click="copy" :disabled="!previewResult">复制</el-button>
              </el-tooltip>
            </div>
            <div class="border border-gray-200 rounded-md p-2 h-full w-full overflow-auto">
              <pre class="whitespace-pre-wrap break-all">{{ previewResult }}</pre>
            </div>
          </div>
        </div>
      </div>
      <el-drawer v-model="pasteSchemaPanel" size="50%" :with-header="false">
        <div class="h-full w-full relative flex flex-col gap-4">
          <div class="flex-grow">
            <div ref="elJsonEditor" class="h-full"></div>
          </div>
          <el-form>
            <el-form-item>
              <el-button type="primary" @click="doPasteSchema">确定</el-button>
              <el-button @click="pasteSchemaPanel = false">关闭</el-button>
            </el-form-item>
          </el-form>
        </div>
      </el-drawer>
    </div>
  </div>
</template>
<script setup lang="ts">
import apiSchema from '@/apis/schema'
import apiTag from '@/apis/tag'
import apiDoc from '@/apis/document'
import { ArrowRight } from '@element-plus/icons-vue'
import { computed, ref, reactive, nextTick } from 'vue'
import { SchemaProp } from 'tms-vue3-ui/dist/es/json-schema'
import useClipboard from 'vue-clipboard3'
import { ElMessage } from 'element-plus'
import JSONEditor from 'jsoneditor'
import 'jsoneditor/dist/jsoneditor.css'
import { watch } from 'vue'

// JSONSchema编辑器
const $jse = ref(null as unknown as { editing: () => any })

const props = defineProps({
  bucketName: { type: String, default: '' },
  scope: { type: String, default: '' },
  schemaId: { type: String, default: '' },
  dbName: { type: String, default: '' }
})
const { bucketName, scope, dbName } = props
const editingSchemaId = ref(props.schemaId)

const submitTitle = computed(() => {
  return editingSchemaId.value ? '修改' : '新建'
})
const title = computed(() => {
  let t = scope === 'document' ? '文档字段定义' : (scope === 'db' ? '数据库属性定义' : '集合属性定义')
  t += '-' + (editingSchemaId.value ? '修改' : '新建')
  return t
})
const activeTab = ref('first')
const tags = reactive([] as any[])

const schema = ref({ name: '', title: '', description: '', order: 99999, parentName: '', scope: scope, tags: [], body: {} })
if (dbName) Object.assign(schema.value, { database: dbName })
const previewResult = ref('')

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

const elJsonEditor = ref<HTMLElement | null>(null)
let jsonEditor: any = null
const jsonEditorOptions = {
  mode: 'code',
  search: false
}
const pasteSchemaPanel = ref(false)
let pastedSchema: any

const onPasteSchema = (prop: SchemaProp) => {
  pasteSchemaPanel.value = true
  nextTick(async () => {
    if (elJsonEditor.value) {
      let child = elJsonEditor.value.querySelector('.jsoneditor')
      if (child) elJsonEditor.value.removeChild(child)
      // @ts-ignore
      jsonEditor = new JSONEditor(elJsonEditor.value, jsonEditorOptions)
      try {
        const clipText = await navigator.clipboard.readText()
        jsonEditor.setText(clipText)
      } catch (e) { }
    }
  })
  return new Promise((resovle, reject) => {
    let unwatch = watch(pasteSchemaPanel, (newVal) => {
      if (newVal === false) {
        unwatch()
        jsonEditor = null
        if (pastedSchema) {
          resovle(JSON.parse(JSON.stringify(pastedSchema)))
          pastedSchema = null
        } else {
          reject()
        }
      }
    })
  })
}

const doPasteSchema = () => {
  pastedSchema = jsonEditor?.get()
  pasteSchemaPanel.value = false
}

const onMessage = (msg: string) => {
  alert(`报错了:${msg}`)
}

const onSubmit = () => {
  let newBody = $jse.value?.editing()
  if (newBody) {
    let { title, description } = newBody
    schema.value.title = title
    schema.value.description = description
    Object.assign(schema.value.body, newBody)
  }
  if (editingSchemaId.value) {
    apiSchema
      .update(bucketName, editingSchemaId.value, schema.value)
      .then(() => {
        ElMessage.success({ message: '修改成功' })
      })
      .catch(() => {
        ElMessage.error({ message: '修改失败' })
      })
  } else {
    apiSchema
      .create(bucketName, schema.value)
      .then((rsp: any) => {
        editingSchemaId.value = rsp._id
        ElMessage.success({ message: '创建成功' })
      })
      .catch(() => {
        ElMessage.error({ message: '创建失败' })
      })
  }
}

apiTag.list(bucketName).then((datas: any) => {
  tags.push(...datas)
})

if (props.schemaId) {
  apiSchema.get(bucketName, props.schemaId).then((data: any) => {
    let { title, description } = data
    data.body.title = title
    data.body.description = description
    schema.value = data
  })
}
</script>

<style lang="scss">
#schemaEditor {
  @apply h-full flex flex-col overflow-hidden;

  .tvu-jse {

    .tvu-jse__properties,
    .tvu-jse__property-fields {
      @apply w-1/2 border border-gray-200 rounded-md overflow-auto p-2;
    }
  }

  .jsoneditor {

    .jsoneditor-transform,
    .jsoneditor-poweredBy {
      display: none;
    }
  }
}
</style>
