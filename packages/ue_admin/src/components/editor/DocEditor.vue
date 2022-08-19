<template>
  <el-dialog title="文档" v-model="dialogVisible" :fullscreen="true" :destroy-on-close="true" :close-on-click-modal="true"
    :before-close="onBeforeClose">
    <div v-if="document?._id" class="p-2 border border-gray-200 mb-2 rounded-md"><span>{{ DocSearchUrl }}</span></div>
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
import * as _ from 'lodash'
import * as Debug from 'debug'

import 'tms-vue3-ui/dist/es/json-doc/style/tailwind.scss'

const debug = Debug('tmw:doc-editor')

const { VITE_SCHEMA_TAGS } = import.meta.env

const emit = defineEmits(['submit'])

type TMWDocument = {
  _id: string
  [k: string]: any
}

const props = defineProps({
  mode: { default: '' },
  dialogVisible: { default: true },
  bucketName: { type: String, default: '' },
  dbName: { type: String, required: true },
  collection: { type: Object, required: true },
  document: { type: Object as PropType<TMWDocument> },
  onClose: { type: Function, default: (newDoc: any) => { } },
})

const { bucketName, dbName, collection, document, onClose } = props
const $jde = ref<{ editing: () => string, editDoc: DocAsArray } | null>(null)
// const plugins: any[] = []

// 文档对象参数信息
const DocSearchUrl = document?._id ? `bucket=${bucketName}&db=${dbName}&cl=${collection.name}&id=${document._id}` : ''

// 文档字段转化规则
const DocFieldConvertRules = (collection.docFieldConvertRules && typeof collection.docFieldConvertRules === 'object') ? collection.docFieldConvertRules : {}

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
 * 将传入的外部数据转换为与field属性定义匹配的数据
 * 
 * 用'__'代表根节点（两个下划线）
 * 
 * 如果指定了多条映射，按如下原则匹配：
 * 外部数组字段匹配的百分比越高，比配的数量越多，越靠前，优先级越高
 * 
 * 内部数据字段对应的可以是字符串或对象。字符串代表外部数据对象的path；对象中的value代表内部字段的值
 * 
 * @param field 指定的文档字段
 * @param source 外部数据来源
 * @param data 外部数据
 */
function convertExternalData(field: Field, source: string, data: any): any {
  const log = debug.extend('convertExternalData')
  const dataType = field.schemaType
  const newData = dataType === 'object' ? {} : (dataType === 'array' ? [] : undefined)
  if (!newData) return newData

  log(`字段【${field.fullname}】从【${source}】获得外部数据\n` + JSON.stringify(data, null, 2))

  let usedRule
  let rules = DocFieldConvertRules[source] ? DocFieldConvertRules[source][field.fullname || '__'] : null

  if (Array.isArray(rules) && rules.length) {
    log(`字段【${field.fullname}】有【${source}】数据转换规则，共【${rules.length}】条`)
    const [matchIndex, score] = rules.reduce((result, rule, index) => {
      // 规则中指定的外部数据需要提供的字段
      let externalPaths: string[] = []
      Object.values(rule).forEach(v => {
        if (v && typeof v === 'string') externalPaths.push(v)
      })
      // 外部数据中包含的指定字段的数量
      let matchedNum = 0
      externalPaths.forEach((p) => { if (Object.hasOwn(data, p)) matchedNum++ })
      // 分数分为3段
      let score = Math.floor(matchedNum / externalPaths.length * 100) * 100000 + (matchedNum * 100) + (99 - index)
      log(`字段【${field.fullname}】有【${source}】数据转换规则中，第【${index}】条得分【${score}】`)
      return score > result[1] ? [index, score] : result
    }, [-1, -1])
    log(`字段【${field.fullname}】有【${source}】数据转换规则中，第【${matchIndex}】条匹配`)
    if (matchIndex !== -1) usedRule = rules[matchIndex]
  } else if (rules && typeof rules === 'object') {
    usedRule = rules
  }
  if (!usedRule) return undefined

  log(`字段【${field.fullname}】有【${source}】数据转换规则\n` + JSON.stringify(usedRule, null, 2))
  let converted = _.transform(usedRule, (result: any, dataDef: any, docKey: string) => {
    if (dataDef) {
      if (typeof dataDef === 'string') {
        // 定义的是外部数据的key
        let val = _.get(data, dataDef)
        _.set(result, docKey, val)
      } else if (Array.isArray(dataDef) && dataDef.length) {
        // 不支持
      } else if (typeof dataDef === 'object') {
        // 定义的是固定的值
        if (dataDef.value ?? false) {
          _.set(result, docKey, dataDef.value)
        }
      }
    }
  }, {})

  log(`字段【${field.fullname}】获得【${source}】转换后数据\n` + JSON.stringify(converted, null, 2))
  if (dataType === 'object' && typeof data === 'object')
    _.assign(newData, data, converted)
  else _.assign(newData, converted)

  return newData
}
/**
 * 对指定字段执行黏贴操作，快速添加子字段
 * @param field 指定的字段
 */
const onJdocPaste = async (field: Field) => {
  const log = debug.extend('onJdocPaste')
  /**从粘贴板中获取数据，添加到文档中*/
  const clipText = await navigator.clipboard.readText()
  try {
    let clipData = JSON.parse(clipText)
    let newData = convertExternalData(field, 'onPaste', clipData)
    return newData
  } catch (e: any) {
    let msg = `粘贴内容填充字段【${field.fullname}】失败：` + e.message
    log(msg)
  }
}
/**
 * 通过外部文件服务选取文件
 */
const onFileSelect = async (field: Field) => {
  const log = debug.extend('onFileSelect')
  let fsUrl = EXTERNAL_FS_URL()
  fsUrl += fsUrl.indexOf('?') === -1 ? '?' : '&'
  fsUrl += `access_token=${getLocalToken()}&pickFile=yes`
  return new Promise((resolve) => {
    openPickFileEditor({
      url: fsUrl,
      onBeforeClose: (fileInfo?: any) => {
        let newData = convertExternalData(field, 'onFileSelect', fileInfo)
        resolve(newData)
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
