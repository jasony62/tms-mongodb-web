<template>
  <div id="collection" class="flex flex-col gap-2 h-full w-full">
    <!--header-->
    <div class="h-12 py-4 px-2">
      <el-breadcrumb :separator-icon="ArrowRight" v-if="EXTRACT === true">
        <el-breadcrumb-item>数据库</el-breadcrumb-item>
        <el-breadcrumb-item>{{ dbName }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{ clName }}</el-breadcrumb-item>
      </el-breadcrumb>
      <el-breadcrumb :separator-icon="ArrowRight" v-else>
        <el-breadcrumb-item :to="{ name: 'databases' }">{{
        DbLabel
      }}</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'database', params: { dbName: dbName } }">{{ dbName }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{ clName }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <!--content-->
    <div class="flex-grow flex flex-row gap-2 overflow-y-auto">
      <!--left-->
      <div class="flex flex-col gap-4" :class="COMPACT ? 'w-full' : 'w-4/5'">
        <el-auto-resizer class="flex-grow overflow-x-auto">
          <template #default="{ height, width }">
            <el-table-v2 id="table" :data="store.documents" :columns="tableColumns" :width="width" :height="height"
              fixed :row-event-handlers="RowEventHandlers" :row-class="rowClass" />
          </template>
        </el-auto-resizer>
        <div class="flex flex-row gap-4 p-2 items-center justify-between">
          <span class="tmw-pagination__text">已选中 {{ selectedDocuments.length }} 条数据</span>
          <div class="flex flex-row gap-4" :hide-on-single-page="true">
            <el-pagination layout="total, sizes, prev, pager, next" background :total="data.docBatch.total"
              :page-sizes="[10, 25, 50, 100]" :current-page="data.docBatch.page" :page-size="data.docBatch.size"
              @current-change="changeDocPage" @size-change="changeDocSize"></el-pagination>
            <el-button @click="listDocByKw">刷新</el-button>
          </div>
        </div>
      </div>
      <!--right-->
      <div class="flex flex-col items-start space-y-3" v-if="!COMPACT">
        <div>
          <el-button v-if="HasDocEditRight" @click="createDocument">添加文档</el-button>
        </div>
        <div v-for="ep in etlPlugins">
          <el-button type="success" plain @click="handleExtract(ep)">{{
        ep.title
      }}</el-button>
        </div>
        <tmw-plugins :plugins="data.plugins" :total-by-all="totalByAll" :total-by-filter="totalByFilter"
          :total-by-checked="totalByChecked" :handle-plugin="handlePlugin"
          :docslen="store.documents.length"></tmw-plugins>
      </div>
    </div>
  </div>
  <tmw-plugin-widget></tmw-plugin-widget>
  <doc-preview-json></doc-preview-json>
</template>

<style scoped lang="scss">
#table :deep(.el-table-v2__row.current-row) {
  @apply text-red-400;
}

#table :deep(.column-filter-active) {
  @apply rounded-md border bg-blue-400 text-white;
}
</style>

<script setup lang="ts">
import { onMounted, reactive, ref, computed, toRaw, h } from 'vue'
import {
  ElMessage,
  ElMessageBox,
  ElTooltip,
  ElCheckbox,
  TableV2FixedDir,
  CheckboxValueType,
  ElTableV2,
  RowEventHandlerParams,
  RowClassNameGetter,
  ElIcon,
} from 'element-plus'
import { ArrowRight, Filter, SortUp, SortDown } from '@element-plus/icons-vue'
import { Batch } from 'tms-vue3'
import * as _ from 'lodash'
import * as Handlebars from 'handlebars'
import apiCl from '@/apis/collection'
import apiSchema from '@/apis/schema'
import apiPlugin from '@/apis/plugin'
import apiEtl from '@/apis/etl'
import apiDoc from '@/apis/document'
import {
  getLocalToken,
  COMPACT_MODE,
  FS_BASE_URL,
  BACK_API_URL,
  DOC_MANUAL,
  EXTRACT_MODE,
  MULTIPLE_MODE,
  LABEL,
  PAGINATION_DOC_SIZE,
} from '@/global'

import facStore from '@/store'
import {
  openDocAclEditor,
  openSelectConditionEditor,
} from '@/components/editor'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useMitt } from '@/composables/mitt'
import { useAssistant } from '@/composables/assistant'
import DocCell from '@/components/DocCell.vue'
import DocPreviewJson from '@/components/DocPreviewJson.vue'
import { useDocPreviewJson } from '@/composables/docPreviewJson'
import TmwPlugins from '@/components/PluginList.vue'
import TmwPluginWidget from '@/components/PluginWidget.vue'
import { useTmwPlugins } from '@/composables/plugins'
import CollectionDocOps from './CollectionDocOps.vue'

type FieldProp = {
  [k: string]: Record<string, any>
}
const COMPACT = computed(() => COMPACT_MODE())
const EXTRACT = computed(() => EXTRACT_MODE())
const MULTIPLE = computed(() => MULTIPLE_MODE())
const DbLabel = computed(() => LABEL('database', '数据库'))

const store = facStore()

// 查找条件下拉框分页包含记录数（筛选下拉框没有分页所以设置分页值太小会导致加载不完数据）
// const LIST_DB_PAGE_SIZE = 100

const Collection = reactive({
  docAclCheck: false,
  schema: {
    body: { properties: {} as any },
  },
  right: [] as string[],
})
const props = defineProps({
  bucketName: { type: String, defalut: '' },
  dbName: { type: String, default: '' },
  clName: { type: String, default: '' },
  tmsAxiosName: { type: String, default: 'mongodb-api' },
})
const { bucketName, dbName, clName } = props

const CurrentRow = ref()
const CheckedRow = reactive<any>({})
const router = useRouter()

// 文档列
const tableColumns = ref<any>([])

const data = reactive({
  docBatch: new Batch(() => { }),
  properties: {} as FieldProp,
  plugins: [] as any[],
  filter: reactive({}),
})

const selectedDocuments = ref<any[]>([])
const totalByAll = computed(() =>
  Object.keys(data.filter).length ? 0 : data.docBatch.total
)
const totalByFilter = computed(() =>
  Object.keys(data.filter).length ? data.docBatch.total : 0
)
const totalByChecked = computed(() => selectedDocuments.value.length)

const HasDocEditRight = computed(() => {
  const { right } = Collection
  if (!right || (Array.isArray(right) && right.length === 0)) return true

  if (Array.isArray(right) && !right.includes('readDoc')) return true

  return false
})
// 设置表格行的样式
const rowClass = ({ rowData }: Parameters<RowClassNameGetter<any>>[0]) => {
  if (MULTIPLE.value === false) {
    // 单选时，通过样式标记选中的行
    if (CurrentRow.value === rowData) return 'current-row'
  }
  return ''
}
// 表格事件
const RowEventHandlers = {
  onClick: (params: RowEventHandlerParams) => {
    CurrentRow.value = params.rowData
  }
}

const handleCondition = () => {
  const conditions = store.conditions
  const criterais = {
    filter: {} as any,
    orderBy: {} as any,
  }
  if (!conditions.length) {
    return criterais
  }
  conditions.forEach((ele: any) => {
    Object.assign(criterais.filter, ele.rule.filter)
    Object.assign(criterais.orderBy, ele.rule.orderBy)
  })
  data.filter = criterais.filter
  return criterais
}
/**
 * 给处于过滤状态的列添加类
 */
const IsColumnFiltered = reactive<{ [n: string]: boolean }>({})
/**
 * 排序列
 */
const SortColumn = reactive<{ [n: string]: string }>({})
/**
 * 设置筛选条件
 */
const handleFilter = (schema: any, name: any) => {
  openSelectConditionEditor({
    bucket: bucketName,
    db: dbName,
    cl: clName,
    columnName: name,
    schema: schema,
    conditions: store.conditions,
    onBeforeClose: (result?: any) => {
      const { condition, isClear, isSort } = result
      store.conditionAddColumn({ condition })
      if (isClear) {
        store.conditionDelColumn({ condition })
        Object.keys(SortColumn).forEach((k) => delete SortColumn[k])
      } else if (isSort) {
        store.conditionCleanSort({ columnName: name })
        Object.keys(SortColumn).forEach((k) => delete SortColumn[k])
      }
      // 如果选择升降序规则，则需重置其他图标
      if (isSort) SortColumn[name] = result.condition.bySort
      /**
       * 设置列状态
       */
      Object.keys(IsColumnFiltered).forEach(k => delete IsColumnFiltered[k])
      store.conditions.forEach((c: any) => {
        if (c.byKeyword) IsColumnFiltered[c.columnName] = true
      })
      listDocByKw()
    },
  })
}

const createDocument = () => {
  router.push({ name: 'docEditor', params: { dbName, clName } })
}
/**
 * 通过预览窗口快速编辑文档
 * @param document
 */
const previewDocument = (document: any) => {
  const onSave = HasDocEditRight.value
    ? (newDoc: any) => {
      apiDoc
        .update(bucketName, dbName, clName, document._id, newDoc)
        .then(() => {
          Object.assign(document, newDoc)
          ElMessage.success({ showClose: true, message: '修改成功' })
        })
    }
    : undefined
  // 打开预览窗口
  const { opened } = useDocPreviewJson({ document, onSave })
  opened.value = true
}

const editDocument = (document: any) => {
  const docId = document._id
  router.push({ name: 'docEditor', params: { dbName, clName, docId } })
}

const removeDocument = (document: any) => {
  ElMessageBox.confirm(`是否确认要删除当前数据?`, {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      store
        .removeDocument({
          bucket: bucketName,
          db: dbName,
          cl: clName,
          document: document,
        })
        .then(() => {
          ElMessage({ message: '删除成功', type: 'success' })
          // listDocByKw()
        })
    })
    .catch(() => { })
}

const copyDocument = (document: any) => {
  if (document.name) document.name += '_复制'
  document = _.omit(document, ['_id'])
  apiDoc.create(bucketName, dbName, clName, document).then(() => {
    listDocByKw()
  })
}
/**
 * 打开文档acl编辑对话框
 */
const openAclEditor = (doc: any) => {
  openDocAclEditor({ doc })
}
/**
 * 文档对象的说明
 */
const renderDocManual = (doc: any) => {
  const tpl = DOC_MANUAL(dbName, clName)
  const html = Handlebars.compile(tpl)({
    bucketName: bucketName ?? '',
    dbName,
    clName,
    doc,
  })
  return html
}

const downLoadFile = (file: any) => {
  const access_token = getLocalToken()
  window.open(`${file.url}?access_token=${access_token}`)
}
/**
 * 设置插件操作的文档参数
 */
const setPluginDocParam = (docScope: string) => {
  if (docScope === 'all') {
    return { filter: 'ALL' }
  } else if (docScope === 'filter') {
    return { filter: handleCondition().filter }
  } else if (docScope === 'checked') {
    let ids = selectedDocuments.value.map((document: any) => document._id)
    return { docIds: ids }
  }
}
/**
 * 执行插件操作
 * @param plugin 指定的插件
 * @param docScope 操作的文档范围类型
 * @param widgetResult 插件部件收集的数据
 */
function onExecute(
  plugin: any,
  docScope = '',
  widgetResult = undefined,
  widgetHandleResponse = false,
  widgetDefaultHandleResponseRequired = false,
  applyAccessTokenField = ''
) {
  let postBody: any
  if (plugin.amount === 'one') {
    let checkedDocument
    if (selectedDocuments.value.length === 1) {
      checkedDocument = toRaw(selectedDocuments.value[0])
    } else if (store.documents.length === 1) {
      checkedDocument = toRaw(store.documents[0])
    }
    if (!checkedDocument) return Promise.reject('没有获得要操作的文档')
    postBody = { docId: toRaw(checkedDocument._id) }
  } else {
    if (['all', 'filter', 'checked'].includes(docScope))
      postBody = setPluginDocParam(docScope)
    else postBody = {}
  }

  // 携带插件部件的数据
  if (widgetResult) {
    if (applyAccessTokenField && typeof applyAccessTokenField === 'string') {
      let field: string = _.get(widgetResult, applyAccessTokenField)
      if (field && typeof field === 'string') {
        /**只有访问自己的后端服务时才添加*/
        if (field.indexOf(BACK_API_URL()) === 0) {
          field += field.indexOf('?') > 0 ? '&' : '?'
          let accessToken = getLocalToken() ?? ''
          field += `access_token=${accessToken}`
          _.set(widgetResult, applyAccessTokenField, field)
        }
      }
    }
    postBody.widget = widgetResult
  }
  // 插件执行的基础参数
  let queryParams = {
    bucket: bucketName ?? '',
    db: dbName,
    cl: clName,
    plugin: plugin.name,
  }

  // 执行插件方法
  return apiPlugin.execute(queryParams, postBody).then((result: any) => {
    if (widgetHandleResponse && widgetDefaultHandleResponseRequired === false)
      return result

    if (typeof result === 'string') {
      /**返回字符串直接显示内容*/
      ElMessage.success({
        message: result,
        showClose: true,
      })
      listDocByKw()
    } else if (result && typeof result === 'object') {
      /**
       * 返回的是对象
       */
      if (result.type === 'documents') {
        /**
         * 返回的是文档数据
         */
        let nInserted = 0,
          nModified = 0,
          nRemoved = 0
        let { inserted, modified, removed } = result
        /**
         * 在当前文档列表中移除删除的记录
         */
        if (Array.isArray(removed) && (nRemoved = removed.length)) {
          let documents = store.documents.filter(
            (doc) => !removed.includes(doc._id)
          )
          store.documents = documents
        }
        /**
         * 在当前文档列表中更新修改的记录
         */
        if (Array.isArray(modified) && (nModified = modified.length)) {
          let map = modified.reduce((m, doc) => {
            if (doc._id && typeof doc._id === 'string') m[doc._id] = doc
            return m
          }, {})
          store.documents.forEach((doc: any, index: number) => {
            let newDoc = map[doc._id]
            if (newDoc) {
              Object.assign(doc, newDoc)
              store.updateDocument({ index, document: doc })
            }
          })
        }
        /**
         * 在当前文档列表中添加插入的记录
         */
        if (Array.isArray(inserted) && (nInserted = inserted.length)) {
          inserted.forEach((newDoc) => {
            if (newDoc._id && typeof newDoc._id === 'string')
              store.documents.unshift(newDoc)
          })
        }
        let msg = `插件[${plugin.title}]执行完毕，添加[${nInserted}]条，修改[${nModified}]条，删除[${nRemoved}]条记录。`
        ElMessage.success({ message: msg, showClose: true })
      } else if (result.type === 'numbers') {
        /**返回操作结果——数量 */
        let { nInserted, nModified, nRemoved } = result
        let message = `插件[${plugin.title}]执行完毕，添加[${parseInt(nInserted) || 0
          }]条，修改[${parseInt(nModified) || 0}]条，删除[${parseInt(nRemoved) || 0
          }]条记录。`
        ElMessageBox.confirm(message, '提示', {
          confirmButtonText: '关闭',
          cancelButtonText: '刷新数据',
          showClose: false,
        }).catch(() => {
          listDocByKw()
        })
      } else if (typeof result.url === 'string') {
        /**下载文件*/
        let url = FS_BASE_URL() + result.url
        window.open(url)
      }
    } else {
      ElMessage.success({
        message: `插件[${plugin.title}]执行完毕。`,
        showClose: true,
      })
      listDocByKw()
    }

    if (widgetHandleResponse === true) return result

    return 'ok'
  })
}
/**
 * 插件
 */
const { handlePlugin } = useTmwPlugins({
  bucketName,
  dbName,
  clName,
  onExecute,
  onCreate: (plugin: any, msg: any) => {
    if (plugin.amount === 'one') {
      let checkedDocument
      if (selectedDocuments.value.length === 1) {
        checkedDocument = toRaw(selectedDocuments.value[0])
      } else if (store.documents.length === 1) {
        checkedDocument = toRaw(store.documents[0])
      }
      // 处理单个文档时，将文档数据传递给插件
      if (checkedDocument) msg.document = toRaw(checkedDocument)
    }
    // 如果插件没有指定schema，传递集合的schema
    msg.schema ??= toRaw(Collection.schema.body)
  },
  onClose: () => {
    listDocByKw()
  },
})
/**
 * 执行ETL插件的提取操作
 */
const handleExtract = (etl: any) => {
  const resultListener = async (event: MessageEvent) => {
    window.removeEventListener('message', resultListener)
    const { data, origin } = event
    if (data?.action === 'extract.close') {
      const docIds = MULTIPLE_MODE()
        ? data?.docs.map((d: any) => d._id)
        : [data.doc._id]
      if (docIds.length) {
        const result = await apiEtl.transform(bucketName, etl._id, docIds)
        for (let proto of result)
          await apiDoc.create(bucketName, dbName, clName, proto)
        listDocByKw()
      }
      opened.value = false
    }
  }
  window.addEventListener('message', resultListener)
  //@TODO 为什么是写死的？
  const { opened } = useAssistant({
    extract: true,
    dbName: 'tms_addrbook',
    clName: 'account',
  })
  opened.value = true
}

const changeDocPage = (page: number) => {
  data.docBatch.goto(page)
}

const changeDocSize = (size: number) => {
  data.docBatch.size = size
  data.docBatch.goto(1)
}
/**
 * 根据标签获得匹配的schema
 * @param tags
 */
const listSchemaByTag = (tags: any) => {
  let temp = {}
  const arrPromise = tags.map((item: string) =>
    apiSchema.listByTag(bucketName, item)
  )
  return Promise.all(arrPromise)
    .then((res) => {
      res.forEach((schemas: any) => {
        schemas.forEach((schema: any) => {
          temp = { ...temp, ...schema.body.properties }
        })
      })
      return temp
    })
    .catch((err: any) => {
      throw new Error(err)
    })
}
/**
 * 获得集合文档定义的顶层属性，作为表格的列
 */
const createTableColumns = async () => {
  let matchedSchema = {}
  let properties: any = Collection.schema.body.properties
  // const { schema_default_tags, schema_tags } = collection
  // if (schema_default_tags && schema_default_tags.length) {
  //   matchedSchema = await listSchemaByTag(schema_default_tags)
  // } else if (schema_tags && schema_tags.length) {
  //   matchedSchema = await listSchemaByTag(schema_tags)
  // } else
  if (properties && typeof properties === 'object') {
    /*需要去除password属性*/
    const props: any = {}
    for (let key in properties) {
      if (properties[key].format !== 'password') {
        props[key] = properties[key]
      }
    }
    Object.assign(matchedSchema, props)
  }
  data.properties = Object.freeze(matchedSchema)
  // 选择列
  if (MULTIPLE.value !== false) {
    tableColumns.value.push({
      key: 'selection',
      width: 40,
      cellRenderer: ({ rowData, rowIndex }: { rowData: any, rowIndex: number }) => {
        const onChange = (checked: CheckboxValueType) => {
          if (checked) selectedDocuments.value.push(rowData)
          else selectedDocuments.value.splice(selectedDocuments.value.indexOf(rowData), 1)
          CheckedRow[rowIndex] = checked
        }
        return h(ElCheckbox, { modelValue: CheckedRow[rowIndex], onChange })
      },
      headerCellRenderer: () => {
        const onChange = (checked: CheckboxValueType) => {
          if (checked) {
            for (let i = 0; i < store.documents.length; i++) CheckedRow[i] = true
            selectedDocuments.value.push(...store.documents)
          } else {
            Object.keys(CheckedRow).forEach((k) => CheckedRow[k] = false)
            selectedDocuments.value.splice(0, selectedDocuments.value.length)
          }
        }
        return h(ElCheckbox, { onChange })
      }
    })
  }
  // 数据列
  Object.entries<any>(data.properties).forEach(([propName, propAttrs]) => {
    tableColumns.value.push({
      key: propName,
      dataKey: propName,
      title: propAttrs.title,
      width: propAttrs.width ?? 120,
      cellRenderer: ({ rowData }: { rowData: any }) => {
        return h(DocCell, {
          propAttrs,
          propName,
          doc: rowData,
          downloadFile: downLoadFile,
        })
      },
      headerCellRenderer: () => {
        const content = [
          h('div', propAttrs.title),
          h(ElIcon, { size: '1rem', class: { 'column-filter-active': IsColumnFiltered[propName] } }, { default: () => h(Filter) }),
        ]
        if (SortColumn[propName] === 'asc') {
          content.push(h(ElIcon, { size: '1rem' }, { default: () => h(SortUp) }))
        } if (SortColumn[propName] === 'desc') {
          content.push(h(ElIcon, { size: '1rem' }, { default: () => h(SortDown) }))
        }
        return h(ElTooltip,
          { content: propAttrs.description || propAttrs.title, placement: 'top', effect: 'light' },
          {
            default: () => h(
              'div',
              { class: 'flex flex-row gap-1 items-center', onClick: (evt: any) => { handleFilter(propAttrs, propName) } },
              content
            )
          })
      }
    })
  })
  // 操作列
  tableColumns.value.push({
    key: 'operations',
    title: '操作',
    width: 140,
    align: 'center',
    fixed: TableV2FixedDir.RIGHT,
    cellRenderer: ({ rowData }: { rowData: any }) => {
      return h(CollectionDocOps, {
        Collection,
        doc: rowData,
        onPreview: previewDocument,
        onEdit: editDocument,
        onCopy: copyDocument,
        onRemove: removeDocument,
        onAcl: openAclEditor
      })
    },
  })
}

const listDocByKw = () => {
  const criterais = handleCondition()
  data.docBatch = store.listDocument({
    bucket: bucketName,
    db: dbName,
    cl: clName,
    size: PAGINATION_DOC_SIZE(),
    criterais,
  })
}

/**
 * etl插件
 */
const etlPlugins = ref<any[]>([])
// apiEtl.findForDst(bucketName, dbName, clName, 'collection').then((etls: any) => {
//   etls.forEach((etl: any) => etlPlugins.value.push(etl))
// })

if (EXTRACT) {
  const emitter = useMitt()
  emitter.on('extract.confirm', () => {
    if (MULTIPLE.value === false) {
      emitter.emit('extract.confirm.result', {
        dbName,
        clName,
        doc: toRaw(CurrentRow.value),
      })
    } else {
      let docs = selectedDocuments.value.map((d) => toRaw(d))
      emitter.emit('extract.confirm.result', { dbName, clName, docs })
    }
  })
}

onMounted(async () => {
  let cl = await apiCl.byName(bucketName, dbName, clName)
  data.plugins = await apiPlugin.getCollectionDocPlugins(
    bucketName,
    dbName,
    clName
  )
  Object.assign(Collection, cl)
  await createTableColumns()
  listDocByKw()
})

onBeforeRouteLeave((to, from) => {
  /**
   * 离开页面时，清空store中的文档列表数据
   */
  store.documents.splice(0, store.documents.length)
})
</script>
