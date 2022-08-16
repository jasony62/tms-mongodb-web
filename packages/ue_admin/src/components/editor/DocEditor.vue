<template>
  <el-dialog title="文档" v-model="dialogVisible" :fullscreen="true" :destroy-on-close="true" :close-on-click-modal="true"
    :before-close="onBeforeClose">
    <div class="flex flex-row gap-4 h-full overflow-auto">
      <tms-json-doc ref="$jde" class="w-1/3 h-full overflow-auto" :schema="collection.schema.body" :value="document"
        :enable-paste="true" :on-paste="onJdocPaste" :on-file-select="onFileSelect" :on-file-download="onFileDownload"
        :show-field-fullname="true" @jdoc-focus="onJdocFocus" @jdoc-blur="onJdocBlur"></tms-json-doc>
      <div v-if="activeField?.schemaType === 'json'" class="w-1/3 h-full flex flex-col gap-2">
        <div>
          <el-button type="primary" @click="updateFieldJson" :disabled="!jsonFieldValueChanged">更新【{{
              activeField.fullname
          }}】</el-button>
        </div>
        <div ref="elJsonEditor" class="flex-grow"></div>
      </div>
      <div class="h-full w-1/3 flex flex-col gap-2 relative">
        <div class="absolute top-0 right-0">
          <el-button @click="preview">预览</el-button>
          <el-tooltip effect="dark" content="复制" placement="bottom" :visible="copyTooltipVisible">
            <el-button @click="copy" :disabled="!previewResult">复制</el-button>
          </el-tooltip>
        </div>
        <div class="border border-gray-300 rounded-md p-2 h-full w-full overflow-auto">
          <pre>{{ previewResult }}</pre>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onBeforeClose">取消</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { nextTick, PropType, ref } from 'vue'
import TmsJsonDoc, { Field, DocAsArray } from 'tms-vue3-ui/dist/es/json-doc'
import apiDoc from '@/apis/document'
import apiSchema from '@/apis/schema'
import { EXTERNAL_FS_URL, getLocalToken } from '@/global'
import { openPickFileEditor } from '@/components/editor'
import JSONEditor from 'jsoneditor'
import 'jsoneditor/dist/jsoneditor.css'
import useClipboard from 'vue-clipboard3'

import 'tms-vue3-ui/dist/es/json-doc/style/tailwind.scss'

const { VITE_SCHEMA_TAGS } = import.meta.env

const emit = defineEmits(['submit'])

type TMWDocument = {
  _id: string
  [k: string]: any
}

const props = defineProps({
  mode: { default: '' },
  dialogVisible: { default: true },
  bucketName: { type: String },
  dbName: { type: String, required: true },
  collection: { type: Object, required: true },
  document: { type: Object as PropType<TMWDocument> },
  onClose: { type: Function, default: (newDoc: any) => { } },
})

const { bucketName, dbName, collection, document, onClose } = props
const $jde = ref<{ editing: () => string, editDoc: DocAsArray } | null>(null)
// const plugins: any[] = []

const elJsonEditor = ref<HTMLElement | null>(null)

const previewResult = ref('')

const { toClipboard } = useClipboard()

// 关闭对话框时执行指定的回调方法
const closeDialog = (newDoc?: any) => {
  onClose(newDoc)
}

// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog(null)
}

const activeField = ref<Field>() // 正在编辑的字段

const jsonFieldValueChanged = ref(false)

const options = {
  mode: 'code',
  search: false,
  onChange: () => {
    jsonFieldValueChanged.value = true
  },
}

let jsonEditor: any = null

const onJdocFocus = (field: Field) => {
  if (activeField.value !== field) {
    activeField.value = field
    if (field.schemaType === 'json') {
      nextTick(() => {
        if (elJsonEditor.value) {
          let child = elJsonEditor.value.querySelector('.jsoneditor')
          if (child) elJsonEditor.value.removeChild(child)
          // @ts-ignore
          jsonEditor = new JSONEditor(elJsonEditor.value, options)
          let fieldValue = $jde.value?.editDoc.get(field.fullname)
          jsonEditor.set(fieldValue ?? '')
        }
      })
    }
  }
}

const onJdocBlur = (field: Field) => { }

const updateFieldJson = () => {
  if (activeField.value) {
    let newVal = jsonEditor.get()
    $jde.value?.editDoc.set(activeField.value.fullname, newVal)
  }
}
/**
 * 对指定字段执行黏贴操作，快速添加子字段
 * @param field 指定的字段
 */
const onJdocPaste = async (field: Field) => {
  /**从粘贴板中获取数据，添加到文档中*/
  const clipText = await navigator.clipboard.readText()
  try {
    let clipData = JSON.parse(clipText)
    return clipData
  } catch (e: any) {
    let msg = `粘贴内容填充字段【${field.fullname}】失败：` + e.message
  }
}
/**
 * 表单通过外部文件服务选取文件
 * @param params 
 */
const onFileSelect = async () => {
  let fsUrl = EXTERNAL_FS_URL()
  fsUrl += fsUrl.indexOf('?') === -1 ? '?' : '&'
  fsUrl += `access_token=${getLocalToken()}&pickFile=yes`
  return new Promise((resolve) => {
    openPickFileEditor({
      url: fsUrl,
      onBeforeClose: (file?: any) => {
        resolve(file)
      },
    })
  })
}

const onFileDownload = (name: string, url: string) => {
  let dlUrl = url
  dlUrl += dlUrl.indexOf('?') === -1 ? '?' : '&'
  dlUrl += `access_token=${getLocalToken()}`
  window.open(dlUrl)
}

const handleFileSubmit = (ref: string | number, files: any[]) => {
  let result: any = {}
  let objPromises = files.map((file) => {
    if (file.hasOwnProperty('url')) {
      return { name: file.name, url: file.url }
    }
    const fileData = new FormData()
    fileData.append('file', file)
    const config = { 'Content-Type': 'multipart/form-data' }
    return apiDoc
      .upload({ bucket: props.bucketName }, fileData, config)
      .then((path: any) => {
        return Promise.resolve({ url: path, name: file.name })
      })
      .catch((err: any) => Promise.reject(err))
  })
  return Promise.all(objPromises)
    .then((rsl) => {
      result[ref] = rsl
      return Promise.resolve(result)
    })
    .catch((err) => Promise.reject(err))
}

const preview = () => {
  previewResult.value = JSON.stringify($jde.value?.editing(), null, 2)
}

const copyTooltipVisible = ref(false)

const copy = async () => {
  try {
    await toClipboard(previewResult.value)
    copyTooltipVisible.value = true
    setTimeout(() => { copyTooltipVisible.value = false }, 1000)
  } catch (e) { }
}

const onSubmit = () => {
  let validate = true
  // if (plugins.length) {
  //   validate = plugins
  //     .map(item => {
  //       const result = utils[item](body.value, newDoc)
  //       if (result.msg === 'success') {
  //         newDoc = result.data
  //         return true
  //       } else {
  //         return false
  //       }
  //     })
  //     .every(ele => ele === true)
  // }
  if (!validate) {
    return false
  }

  let newDoc = $jde.value?.editing()
  if (newDoc) {
    if (document?._id) {
      apiDoc
        .update(props.bucketName, dbName, collection.name, document._id, newDoc)
        .then(() => {
          emit('submit', newDoc)
          closeDialog(newDoc)
        })
    } else {
      if (Object.keys(newDoc).length === 0) {
        closeDialog(null)
        return false
      }
      apiDoc
        .create(bucketName, dbName, collection.name, newDoc)
        .then((newDoc: any) => {
          emit('submit', newDoc)
          closeDialog(newDoc)
        })
    }
  }
}

const handleProperty = async () => {
  let tags = VITE_SCHEMA_TAGS
    ? VITE_SCHEMA_TAGS.split(',')
    : collection.schema_tags
  let body: { [k: string]: any } = {}

  if (tags && tags.length) {
    for (let i = 0; i < tags.length; i++) {
      let schemas = await apiSchema.listByTag(props.bucketName, tags[i])
      schemas.forEach(
        (schema: { body: { [s: string]: unknown } | ArrayLike<unknown> }) => {
          Object.entries(schema.body).forEach(([key, val]) => {
            if (val && typeof val === 'object') {
              // 如果属性值为空就不合并
              if (!body[key]) body[key] = {}
              if (JSON.stringify(val) !== '{}') Object.assign(body[key], val)
            } else {
              body[key] = val
            }
          })
        }
      )
    }
    body.value = body
  } else {
    Object.assign(body.value, collection.schema.body)
  }
}
</script>

<style lang="scss">
#docEditor {

  .el-dialog.is-fullscreen {
    @apply flex flex-col;

    .el-dialog__body {
      @apply flex-grow overflow-auto;
    }
  }

  .jsoneditor {

    .jsoneditor-transform,
    .jsoneditor-repair,
    .jsoneditor-poweredBy {
      display: none;
    }
  }
}
</style>
