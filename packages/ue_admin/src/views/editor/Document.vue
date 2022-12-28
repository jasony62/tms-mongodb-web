<template>
  <div id="docEditor">
    <!--header-->
    <div class="h-12 py-4 px-2">
      <el-breadcrumb :separator-icon="ArrowRight">
        <el-breadcrumb-item :to="{ name: 'databases' }">数据库</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'database', params: { dbName } }">{{
            dbName
        }}</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'collection', params: { dbName, clName } }">{{ clName }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{
            document._id ? document._id : '新建文档'
        }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="p-2 border border-gray-200 mb-2 rounded-md text-center">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button v-for="ep in etlPlugins" type="success" @click="handleExtract(ep)">{{ ep.title }}</el-button>
    </div>
    <div class="flex flex-row gap-4 h-full overflow-auto pb-4" v-if="collection._id && (!docId || document._id)">
      <div class="w-1/3 h-full flex-grow-none overflow-auto">
        <tms-json-doc ref="$jde" :schema="collection.schema.body" :value="document" :enable-paste="true"
          :on-paste="onJdocPaste" :on-lookup="onJdocLookup" :on-file-select="onFileSelect"
          :on-file-download="onFileDownload" :show-field-fullname="showFieldFullname" :hide-root-title="true"
          :hide-root-description="true" @jdoc-focus="onJdocFocus" @jdoc-blur="onJdocBlur"></tms-json-doc>
        <el-form label-position="top">
          <el-form-item label="标签">
            <el-select v-model="docTags" multiple clearable placeholder="请选择">
              <el-option v-for="tag in tags" :label="tag.name" :value="tag.name"></el-option>
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <div v-if="isSmallLeft" class="w-1/3 h-full flex flex-col gap-2 overflow-auto">
        <div v-if="activeField?.schemaType === 'json'">
          <el-button type="primary" @click="updateFieldJson" :disabled="!jsonFieldValueChanged">更新【{{
              activeField.fullname
          }}】</el-button>
        </div>
        <div v-if="activeField?.schemaType === 'json'" ref="elJsonEditor" class="flex-grow"></div>
        <div v-if="/mustache|handlebars/.test(activeField?.schemaProp.attrs?.format)">
          <handlebars-viz :template-text="activeFieldValue" />
        </div>
      </div>
      <div class="h-full flex flex-col gap-2 relative" :class="isSmallLeft ? 'w-1/3' : 'w-2/3'">
        <div class="absolute top-0 right-0" style="z-index: 999">
          <el-button @click="diagram">图形</el-button>
          <el-button @click="preview">预览</el-button>
          <el-tooltip effect="dark" content="复制" placement="bottom" :visible="copyTooltipVisible">
            <el-button @click="copy" :disabled="!previewResult">复制</el-button>
          </el-tooltip>
        </div>
        <div class="border border-gray-300 rounded-md p-2 h-full w-full overflow-auto">
          <pre v-if="previewMode === 'text'" class="whitespace-pre-wrap break-all">{{ previewResult }}</pre>
          <json-diagram-x6 ref="$diagram" v-if="previewMode === 'diagram'" :schema="collection.schema.body"
            :doc="document" @click-value-node="onClickValueNode">
          </json-diagram-x6>
        </div>
      </div>
    </div>
    <el-drawer v-model="pasteDocPanel" size="50%" :with-header="false">
      <div class="h-full w-full relative flex flex-col gap-4">
        <div class="flex-grow">
          <div ref="elPasteDocEditor" class="h-full"></div>
        </div>
        <el-form>
          <el-form-item>
            <el-button type="primary" @click="doPasteSchema">确定</el-button>
            <el-button @click="pasteDocPanel = false">关闭</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-drawer>
  </div>
</template>
<style lang="scss">
#docEditor {
  @apply w-full h-full overflow-auto flex flex-col gap-2;

  .jsoneditor {

    .jsoneditor-transform,
    .jsoneditor-poweredBy {
      display: none;
    }
  }

}
</style>

<script setup lang="ts">
import { computed, nextTick, ref, inject, watch } from 'vue'
import TmsJsonDoc, { Field, DocAsArray } from 'tms-vue3-ui/dist/es/json-doc'
import 'tms-vue3-ui/dist/es/json-doc/style/tailwind.scss'
import { EXTERNAL_FS_URL, getLocalToken, TMW_APP_TAGS } from '@/global'
import apiTag from '@/apis/tag'
import apiCl from '@/apis/collection'
import apiDoc from '@/apis/document'
import apiEtl from '@/apis/etl'
import useClipboard from 'vue-clipboard3'
import * as _ from 'lodash'
import Debug from 'debug'
import { openPickFileEditor } from '@/components/editor'
import { ElMessage } from 'element-plus'
import { ArrowRight } from '@element-plus/icons-vue'
import JSONEditor from 'jsoneditor'
import 'jsoneditor/dist/jsoneditor.css'
// @ts-ignore
import { HandlebarsViz } from 'tms-template-viz'
import 'tms-template-viz/dist/style.css'
import JsonDiagramX6 from '@/components/JsonDiagramX6.vue'
import { dialogInjectionKey } from 'gitart-vue-dialog'
import PropValueEditor from '@/components/PropValueEditor.vue'
import { useAssistant } from '@/composables/assistant'

// 系统指定的标签字段名称
const TagsFieldName = TMW_APP_TAGS()

const debug = Debug('tmw:doc-editor')

const props = defineProps({
  bucketName: { type: String, defalut: '' },
  dbName: { type: String, required: true },
  clName: { type: String, required: true },
  docId: { type: String, default: '' },
})

const { bucketName, dbName, clName, docId } = props
const $jde = ref<{ editing: () => any; editDoc: DocAsArray } | null>(null)

const collection = ref<any>({ schema: { body: {} } })

const document = ref({ _id: '' })

const showFieldFullname = ref(false)

// 文档字段转化规则
const DocFieldConvertRules = computed(() =>
  collection.value.docFieldConvertRules &&
    typeof collection.value.docFieldConvertRules === 'object' &&
    Object.keys(collection.value.docFieldConvertRules).length
    ? collection.value.docFieldConvertRules
    : null
)

const elJsonEditor = ref<HTMLElement | null>(null)

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

const isSmallLeft = computed(() => {
  if (activeField.value?.schemaType === 'json') {
    return true
  } else if (activeField.value?.schemaType === 'string') {
    if (['mustache', 'handlebars'].includes(activeField.value.schemaProp.attrs?.format)) {
      return true
    }
  }
  return false
})

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

const activeFieldValue = computed(() => {
  let field = activeField.value
  if (field) {
    let fieldValue = $jde.value?.editDoc.get(field.fullname)
    return fieldValue
  }
})

const $diagram = ref<{ setPropertyValue: (field: Field, newVal: any) => void } | null>(null)
const $dialog = inject(dialogInjectionKey)
/**
 * 在图表上选中了一个值节点
 */
const onClickValueNode = (field: Field) => {
  if ($dialog) {
    const editDoc = $jde.value?.editDoc
    $dialog.addDialog({
      component: PropValueEditor,
      props: {
        field,
        editDoc,
        onSubmit: (newVal: any) => {
          // 修改表单中的数据
          $jde.value?.editDoc.set(field.fullname, newVal)
          // 修改图标中的数据
          $diagram.value?.setPropertyValue(field, newVal)
        }
      },
    })
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
  const newData =
    dataType === 'object' ? {} : dataType === 'array' ? [] : undefined
  if (!newData) return newData

  log(
    `字段【${field.fullname}】从【${source}】获得外部数据\n` +
    JSON.stringify(data, null, 2)
  )
  if (DocFieldConvertRules.value === null) {
    log(
      `字段【${field.fullname}】获得【${source}】数据，集合没有指定转换规则，直接使用粘贴数据`
    )
    return data
  }

  let usedRule
  let rules = DocFieldConvertRules.value[source]
    ? DocFieldConvertRules.value[source][field.fullname || '__']
    : []

  if (Array.isArray(rules) && rules.length) {
    log(
      `字段【${field.fullname}】有【${source}】数据转换规则，共【${rules.length}】条`
    )
    const [matchIndex, score] = rules.reduce(
      (result, rule, index) => {
        // 规则中指定的外部数据需要提供的字段
        let externalPaths: string[] = []
        Object.values(rule).forEach((v) => {
          if (v && typeof v === 'string') externalPaths.push(v)
        })
        // 外部数据中包含的指定字段的数量
        let matchedNum = 0
        externalPaths.forEach((p) => {
          if (Object.hasOwn(data, p)) matchedNum++
        })
        // 分数分为3段
        let score =
          Math.floor((matchedNum / externalPaths.length) * 100) * 100000 +
          matchedNum * 100 +
          (99 - index)
        log(
          `字段【${field.fullname}】有【${source}】数据转换规则中，第【${index}】条得分【${score}】`
        )
        return score > result[1] ? [index, score] : result
      },
      [-1, -1]
    )
    log(
      `字段【${field.fullname}】有【${source}】数据转换规则中，第【${matchIndex}】条匹配`
    )
    if (matchIndex !== -1) usedRule = rules[matchIndex]
  } else if (rules && typeof rules === 'object') {
    usedRule = rules
  }
  if (!usedRule) return undefined

  log(
    `字段【${field.fullname}】有【${source}】数据转换规则\n` +
    JSON.stringify(usedRule, null, 2)
  )
  let converted = _.transform(
    usedRule,
    (result: any, dataDef: any, docKey: string) => {
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
    },
    {}
  )

  log(
    `字段【${field.fullname}】获得【${source}】转换后数据\n` +
    JSON.stringify(converted, null, 2)
  )
  if (dataType === 'object' && typeof data === 'object')
    _.assign(newData, data, converted)
  else _.assign(newData, converted)

  return newData
}
/**
 * 执行数据转化操作
 * @param result 
 * @param doc 
 * @param transform 
 */
const lookupTransform = (result: any, doc: any, transform: any) => {
  if (Array.isArray(transform) && transform.length) {
    transform.forEach((rule) => {
      let { src, dst } = rule
      let val = _.get(doc, src)
      _.set(result, dst, val)
    })
  } else
    result.id = doc._id
}
/**
 * 表单字段要求查询数据
 * @param field 
 */
const onJdocLookup = async (field: Field) => {
  const { lookup } = field.schemaProp
  if (!lookup || typeof lookup !== 'object') return
  const { source, transform } = lookup
  if (!source || typeof source !== 'object') return
  if (!source.cl || typeof source.cl !== 'string') return

  return new Promise((resolve) => {
    const resultListener = async (event: MessageEvent) => {
      window.removeEventListener('message', resultListener)
      const { data, origin } = event
      if (data?.action === 'extract.close') {
        let result: any = {}
        let doc = data?.doc
        if (doc && typeof doc === 'object') {
          lookupTransform(result, doc, transform)
        }
        opened.value = false
        resolve(result)
      }
    }
    window.addEventListener('message', resultListener)
    const { opened } = useAssistant({ extract: true, multiple: false, dbName, clName: source.cl })
    opened.value = true
  })
}

const pasteDocPanel = ref(false)
const elPasteDocEditor = ref<HTMLElement | null>(null)
let pasteDocEditor: any
let pastedDoc: any
const jsonEditorOptions = {
  mode: 'code',
  search: false
}
/**
 * 对指定字段执行黏贴操作，快速添加子字段
 * @param field 指定的字段
 */
const onJdocPaste = async (field: Field) => {
  pasteDocPanel.value = true
  nextTick(async () => {
    if (elPasteDocEditor.value) {
      let child = elPasteDocEditor.value.querySelector('.jsoneditor')
      if (child) elPasteDocEditor.value.removeChild(child)
      // @ts-ignore
      pasteDocEditor = new JSONEditor(elPasteDocEditor.value, jsonEditorOptions)
      try {
        const clipText = await navigator.clipboard.readText()
        pasteDocEditor.setText(clipText ?? '')
      } catch (e) { }
    }
  })
  return new Promise((resovle, reject) => {
    let unwatch = watch(pasteDocPanel, (newVal) => {
      if (newVal === false) {
        unwatch()
        pasteDocEditor = null
        if (pastedDoc) {
          resovle(JSON.parse(JSON.stringify(pastedDoc)))
          pastedDoc = null
        } else {
          reject()
        }
      }
    })
  })
}
const doPasteSchema = () => {
  pastedDoc = pasteDocEditor?.get()
  pasteDocPanel.value = false
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
// 预览方式，支持文本和图形
const previewMode = ref('')
const previewData = ref<any>({})
const previewResult = ref('')

const diagram = () => {
  const switchToDiagram = () => {
    previewMode.value = 'diagram'
    previewData.value = $jde.value?.editing() || {}
  }
  if (previewMode.value === 'diagram') {
    /**重新生成图表对象*/
    previewMode.value = ''
    nextTick(() => {
      switchToDiagram()
    })
  } else {
    switchToDiagram()
  }
}

const preview = () => {
  previewMode.value = 'text'
  previewResult.value = JSON.stringify($jde.value?.editing(), null, 2)
}

const copyTooltipVisible = ref(false)

const copy = async () => {
  try {
    await toClipboard(previewResult.value)
    copyTooltipVisible.value = true
    setTimeout(() => {
      copyTooltipVisible.value = false
    }, 1000)
  } catch (e) { }
}
/**
 * 更新预览视图
 */
const updatePreview = () => {
  const currentMode = previewMode.value
  previewMode.value = ''
  nextTick(() => {
    switch (currentMode) {
      case 'diagram':
        diagram()
        break
      case 'preview':
        preview()
        break
    }
  })
}

const onSubmit = () => {
  let newDoc = $jde.value?.editing()
  if (newDoc) {
    newDoc[TagsFieldName] = docTags.value
    if (document.value._id) {
      apiDoc
        .update(bucketName, dbName, clName, document.value._id, newDoc)
        .then(() => {
          Object.assign(document.value, newDoc)
          // 更新预览视图
          if (previewMode.value) updatePreview()
          ElMessage.success({ message: '修改成功' })
        })
    } else {
      if (Object.keys(newDoc).length === 0) return false
      apiDoc
        .create(bucketName, dbName, collection.value.name, newDoc)
        .then((newDoc: any) => {
          document.value = newDoc
          ElMessage.success({ message: '新建成功' })
        })
    }
  }
}
/**
 * 执行ETL插件的提取操作
 */
const handleExtract = (etl: any) => {
  const resultListener = async (event: MessageEvent) => {
    window.removeEventListener('message', resultListener)
    const { data, origin } = event
    if (data?.action === 'extract.close') {
      let docIds = data?.docIds
      if (Array.isArray(docIds) && docIds.length) {
        const result = await apiEtl.transform(bucketName, etl._id, docIds)
        if (Array.isArray(result) && result.length)
          for (let key in result[0])
            $jde.value?.editDoc.set(key, result[0][key])
      }
      opened.value = false
    }
  }
  window.addEventListener('message', resultListener)
  let options: any = { extract: true, dbName: 'e2e5gmx_addrbook', clName: 'account' }
  if (etl?.rules?.multiple !== true) options.multiple = false
  const { opened } = useAssistant(options)
  opened.value = true
}

// 全部标签
const tags = ref<any[]>([])

// 文档上的标签
const docTags = ref<string[]>([])

apiCl.byName(bucketName, dbName, clName).then((cl: any) => {
  collection.value = cl
})
apiTag.list(bucketName).then((datas: any) => {
  tags.value.push(...datas)
})
/**
 * etl插件
 */
const etlPlugins = ref<any[]>([])
apiEtl.findForDst(bucketName, dbName, clName, 'document').then((etls: any) => {
  etls.forEach((etl: any) => etlPlugins.value.push(etl))
})

if (docId)
  apiDoc.get(bucketName, dbName, clName, docId).then((doc: any) => {
    document.value = doc
    let tags: string[] = Array.isArray(doc[TagsFieldName]) ? doc[TagsFieldName] : []
    docTags.value.push(...tags)
  })
</script>
