<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <tms-el-json-doc :is-submit="isSubmit" :schema="body" :doc="document" v-on:submit="onJsonDocSubmit"
      :on-file-submit="handleFileSubmit" :on-axios="handleAxios" :on-file-download="handleDownload"></tms-el-json-doc>
  </el-dialog>
</template>
<script setup lang="ts">
import { ElJsonDoc as TmsElJsonDoc } from 'tms-vue3-ui'
import { TmsAxios } from 'tms-vue3'
import utils from '../tms/utils'
import apiDoc from '../apis/document'
import apiSchema from '../apis/schema'
import { ref } from 'vue'

const {
  VITE_SCHEMA_TAGS,
  VITE_FRONT_DOCEDITOR_ADD,
  VITE_FRONT_DOCEDITOR_MODIFY
} = import.meta.env

const emit = defineEmits(['submit'])

const props = defineProps({
  dialogVisible: { default: true },
  bucketName: { type: String }
})

const isSubmit = ref(false)
const body = ref({})
const document = ref({} as { [k: string]: any })
const destroyOnClose = ref(true)
const closeOnClickModal = ref(false)

let dbName = ''
let collection: { [k: string]: any } = {}
const plugins: any[] = []

const handleAxios = () => {
  return TmsAxios.ins('mongodb-api')
}

// const handleDownload = (name, url) => {
//   const access_token = this.$getToken()
//   window.open(`${url}?access_token=${access_token}`)
// }

const handleFileSubmit = (ref: string | number, files: any[]) => {
  let result: any = {}
  let objPromises = files.map(file => {
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
    .then(rsl => {
      result[ref] = rsl
      return Promise.resolve(result)
    })
    .catch(err => Promise.reject(err))
},
const onJsonDocSubmit = (slimDoc: any, newDoc: any) => {
  isSubmit.value = true
  let validate = true
  if (plugins.length) {
    validate = plugins
      .map(item => {
        const result = utils[item](body.value, newDoc)
        if (result.msg === 'success') {
          newDoc = result.data
          return true
        } else {
          return false
        }
      })
      .every(ele => ele === true)
  }
  if (!validate) {
    isSubmit.value = false
    return false
  }
  if (document.value && document.value._id) {
    apiDoc
      .update(
        props.bucketName,
        dbName,
        collection.name,
        document.value._id,
        newDoc
      )
      .then((newDoc: any) => emit('submit', newDoc))
      .finally(() => (isSubmit.value = false))
  } else {
    apiDoc
      .create(props.bucketName, dbName, collection.name, newDoc)
      .then((newDoc: any) => emit('submit', newDoc))
      .finally(() => (isSubmit.value = false))
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
      schemas.forEach((schema: { body: { [s: string]: unknown } | ArrayLike<unknown> }) => {
        Object.entries(schema.body).forEach(([key, val]) => {
          if (val && typeof val === 'object') {
            // 如果属性值为空就不合并
            if (!body[key]) body[key] = {}
            if (JSON.stringify(val) !== '{}') Object.assign(body[key], val)
          } else {
            body[key] = val
          }
        })
      })
    }
    body.value = body
  } else {
    Object.assign(body.value, collection.schema.body)
  }
}
    // async open(bucketName, dbName, collection, doc) {
    //   props.bucketName = bucketName
    //   dbName = dbName
    //   collection = collection
    //   if (VITE_FRONT_DOCEDITOR_ADD) {
    //     let str = VITE_FRONT_DOCEDITOR_ADD.replace(/\s/g, '')
    //     plugins = str.split(',')
    //   }
    //   await this.handleProperty()
    //   if (doc && doc._id) {
    //     if (VITE_FRONT_DOCEDITOR_MODIFY) {
    //       let str = VITE_FRONT_DOCEDITOR_MODIFY.replace(/\s/g, '')
    //       plugins = str.split(',')
    //     }
    //     document.value = JSON.parse(
    //       JSON.stringify(Object.assign(document.value, doc))
    //     )
    //   }
    //   this.$mount()
    //   document.body.appendChild(this.$el)
    //   return new Promise(resolve => {
    //     this.$on('submit', newDoc => {
    //       this.dialogVisible = false
    //       resolve(newDoc)
    //     })
    //   })
    // }
</script>
