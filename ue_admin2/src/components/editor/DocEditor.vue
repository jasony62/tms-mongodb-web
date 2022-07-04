<template>
  <el-dialog title="文档" v-model="dialogVisible" :fullscreen="true" :destroy-on-close="true" :close-on-click-modal="true"
    :before-close="onBeforeClose">
    <tms-json-doc ref="jsonDocEditor" :schema="collection.schema.body" :value="document" :on-file-select="onFileSelect"
      :on-file-download="onFileDownload"></tms-json-doc>
    <template #footer>
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onBeforeClose">取消</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { PropType, ref } from 'vue'
import { JsonDoc as TmsJsonDoc } from 'tms-vue3-ui'
import apiDoc from '@/apis/document'
import apiSchema from '@/apis/schema'
import { getLocalToken } from '@/global'
import { openPickFileEditor } from '@/components/editor'

import 'tms-vue3-ui/dist/es/json-doc/style/tailwind.scss'

const {
  VITE_SCHEMA_TAGS,
  VITE_FRONT_DOCEDITOR_ADD,
  VITE_FRONT_DOCEDITOR_MODIFY,
  VITE_EXTRAFILESYSTEM_URL,
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
const jsonDocEditor = ref<{ editing: () => string } | null>(null)
// const plugins: any[] = []

// 关闭对话框时执行指定的回调方法
const closeDialog = (newDoc?: any) => {
  onClose(newDoc)
}

// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog(null)
}

const onFileSelect = async (params: any) => {
  const openUrl = VITE_EXTRAFILESYSTEM_URL + '?access_token=' + getLocalToken()
  return new Promise((resolve) => {
    /**这里需要返回文件属性中items.properties中定义的内容*/
    openPickFileEditor({
      url: openUrl,
      onBeforeClose: (newJson?: any) => {
        resolve({
          name: newJson.name,
          url: newJson.url,
        })
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

  let newDoc = jsonDocEditor.value?.editing()
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
