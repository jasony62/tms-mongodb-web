<template>
  <el-dialog title="文档" v-model="dialogVisible" :fullscreen="true" :destroy-on-close="true" :close-on-click-modal="true"
    :before-close="onBeforeClose">
    <div class="flex flex-row gap-4 h-full overflow-auto">
      <tms-json-doc ref="$jde" class="w-1/3 h-full overflow-auto" :schema="collection.schema.body" :value="document"
        :on-file-select="onFileSelect" :on-file-download="onFileDownload" :show-field-fullname="true"
        @jdoc-focus="onJdocFocus" @jdoc-blur="onJdocBlur"></tms-json-doc>
      <div v-if="activeField?.schemaType === 'json'" class="w-1/3 h-full flex flex-col">
        <div>
          <el-button @click="updateFieldJson">更新数据【{{ activeField.fullname }}】</el-button>
        </div>
        <div ref="elJsonEditor" class="flex-grow"></div>
      </div>
      <div class="h-full w-1/3 flex flex-col gap-2 relative">
        <div class="absolute top-0 right-0">
          <el-button @click="preview">预览</el-button>
        </div>
        <div class="border-2 border-gray-300 rounded-md p-2 h-full w-full overflow-auto">
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

import 'tms-vue3-ui/dist/es/json-doc/style/tailwind.scss'

const {
  VITE_SCHEMA_TAGS,
  VITE_FRONT_DOCEDITOR_ADD,
  VITE_FRONT_DOCEDITOR_MODIFY,
} = import.meta.env

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

// 关闭对话框时执行指定的回调方法
const closeDialog = (newDoc?: any) => {
  onClose(newDoc)
}

// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog(null)
}

const activeField = ref<Field>() // 正在编辑的字段

const options = {
  mode: 'code',
  search: false,
  transform: false,
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
          jsonEditor.set($jde.value?.editDoc.get(field.fullname))
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
 * 表单通过外部文件服务选取文件
 * @param params 
 */
const onFileSelect = async () => {
  const fsUrl = `${EXTERNAL_FS_URL()}?access_token=${getLocalToken()}`
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
  const access_token = getLocalToken()
  window.open(`${url}?access_token=${access_token}`)
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
