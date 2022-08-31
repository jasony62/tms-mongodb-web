<template>
  <div id="docEditor">
    <!--header-->
    <div class="h-12 py-4 px-2">
      <el-breadcrumb :separator-icon="ArrowRight">
        <el-breadcrumb-item :to="{ name: 'home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'database', params: { dbName } }">{{  dbName  }}</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'collection', params: { dbName, clName } }">{{  clName  }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{  document._id ? document._id : '新建文档'  }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="p-2 border border-gray-200 mb-2 rounded-md text-center">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button type="default" @click="openDrawer" v-if="!COMPACT">分屏</el-button>
    </div>
    <div class="flex flex-row gap-4 h-full overflow-auto px-4 pb-4" v-if="collection._id">
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
          <pre>{{   previewResult   }}</pre>
        </div>
      </div>
    </div>
    <el-drawer v-model="assistant" size="60%">
      <div class="h-full w-full relative">
        <iframe class="assistant" src="/admin/home?compact=Y"></iframe>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import TmsJsonDoc, { Field, DocAsArray } from 'tms-vue3-ui/dist/es/json-doc'
import { EXTERNAL_FS_URL, getLocalToken, COMPACT_MODE } from '@/global'
import apiDoc from '@/apis/document'
import apiCl from '@/apis/collection'
import apiSchema from '@/apis/schema'
import useClipboard from 'vue-clipboard3'
import * as _ from 'lodash'
import Debug from 'debug'
import { openPickFileEditor } from '@/components/editor';
import { ArrowRight } from '@element-plus/icons-vue'
import JSONEditor from 'jsoneditor'
import 'jsoneditor/dist/jsoneditor.css'

const COMPACT = computed(() => COMPACT_MODE())

const debug = Debug('tmw:doc-editor')

const props = defineProps({
  bucketName: { type: String, defalut: '' },
  dbName: { type: String, required: true },
  clName: { type: String, required: true },
  docId: { type: String, default: '' },
})

const { VITE_SCHEMA_TAGS } = import.meta.env

const { bucketName, dbName, clName, docId } = props
const $jde = ref<{ editing: () => string, editDoc: DocAsArray } | null>(null)
// const plugins: any[] = []

const collection = ref<any>({ schema: { body: {} } })

const document = ref({ _id: '' })

// 文档字段转化规则
const DocFieldConvertRules = computed(() =>
  (collection.value.docFieldConvertRules && typeof collection.value.docFieldConvertRules === 'object' && Object.keys(collection.value.docFieldConvertRules).length) ? collection.value.docFieldConvertRules : null
)

const elJsonEditor = ref<HTMLElement | null>(null)

const previewResult = ref('')

const { toClipboard } = useClipboard()

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
  if (DocFieldConvertRules.value === null) {
    log(`字段【${field.fullname}】获得【${source}】数据，集合没有指定转换规则，直接使用粘贴数据`)
    return data
  }

  let usedRule
  let rules = DocFieldConvertRules.value[source] ? DocFieldConvertRules.value[source][field.fullname || '__'] : []

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
    if (document.value._id) {
      apiDoc
        .update(bucketName, dbName, clName, document.value._id, newDoc)
        .then(() => { })
    } else {
      if (Object.keys(newDoc).length === 0) {
        return false
      }
      apiDoc
        .create(bucketName, dbName, collection.value.name, newDoc)
        .then((newDoc: any) => {
          document.value = newDoc
        })
    }
  }
}

const handleProperty = async () => {
  let tags = VITE_SCHEMA_TAGS
    ? VITE_SCHEMA_TAGS.split(',')
    : collection.value.schema_tags
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
    Object.assign(body.value, collection.value.schema.body)
  }
}

const assistant = ref(false)

const openDrawer = () => {
  assistant.value = true
}


apiCl.byName(bucketName, dbName, clName).then((cl: any) => {
  collection.value = cl
})

if (docId)
  apiDoc.get(bucketName, dbName, clName, docId).then((doc: any) => {
    document.value = doc
  })

</script>

<style lang="scss">
#docEditor {

  @apply w-full h-full overflow-auto flex flex-col gap-2;

  .jsoneditor {

    .jsoneditor-transform,
    .jsoneditor-repair,
    .jsoneditor-poweredBy {
      display: none;
    }
  }

  .el-drawer__header {
    margin-bottom: 0;
  }

  .el-drawer__body {
    padding-top: 0;
  }

  .assistant {
    border: 0;
    @apply h-full w-full;
  }
}
</style>
