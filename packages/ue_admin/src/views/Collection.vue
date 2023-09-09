<template>
  <div class="flex flex-col gap-2">
    <!--header-->
    <div class="h-12 py-4 px-2">
      <el-breadcrumb :separator-icon="ArrowRight" v-if="EXTRACT === true">
        <el-breadcrumb-item>数据库</el-breadcrumb-item>
        <el-breadcrumb-item>{{ dbName }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{ clName }}</el-breadcrumb-item>
      </el-breadcrumb>
      <el-breadcrumb :separator-icon="ArrowRight" v-else>
        <el-breadcrumb-item :to="{ name: 'databases' }">{{ DbLabel }}</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'database', params: { dbName: dbName } }">{{ dbName }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{ clName }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <!--content-->
    <div class="flex flex-row gap-2">
      <!--left-->
      <div class="flex flex-col gap-4" :class="COMPACT ? 'w-full' : 'w-4/5'">
        <el-table id="tables" ref="tableRef" :cell-class-name="'tmw-table__cell'" :data="store.documents"
          highlight-current-row stripe @selection-change="handleSelectionChange" @current-change="handleCurrentChange"
          @row-click="handleRowClick">
          <el-table-column type="selection" width="40" v-if="MULTIPLE !== false" />
          <el-table-column type="expand" width="40">
            <template #default="props">
              <div class="ml-20">
                <div v-html="renderDocManual(props.row)"></div>
              </div>
            </template>
          </el-table-column>
          <el-table-column v-for="(s, k, i) in data.properties" :key="i" :prop="k">
            <template #header>
              <div @click="handleFilter(s, k)">
                <span v-if="s.required" class="text-red-400">*</span>
                <span>{{ s.title }}</span>
                <img :data-id="k" class="w-4 h-4 inline-block" src="../assets/imgs/icon_filter.png" />
              </div>
            </template>
            <template #default="scope">
              <span v-if="s.type === 'boolean'">{{
                scope.row[k] ? '是' : '否'
              }}</span>
              <span v-else-if="s.type === 'array' && s.items && s.items.format === 'file'
                ">
                <span v-for="(i, v) in scope.row[k]" :key="v">
                  <el-link type="primary" @click="downLoadFile(i)">{{
                    i.name
                  }}</el-link>
                  <br />
                </span>
              </span>
              <span v-else-if="s.type === 'array' && s.enum && s.enum.length">
                <span v-if="s.enumGroups && s.enumGroups.length">
                  <span v-for="(g, i) in s.enumGroups" :key="i">
                    <span v-if="scope.row[g.assocEnum.property] === g.assocEnum.value
                      ">
                      <span v-for="(e, v) in s.enum" :key="v">
                        <span v-if="e.group === g.id &&
                          scope.row[k] &&
                          scope.row[k].length &&
                          scope.row[k].includes(e.value)
                          ">{{ e.label }}&nbsp;</span>
                      </span>
                    </span>
                  </span>
                </span>
                <span v-else>
                  <span v-for="(i, v) in s.enum" :key="v">
                    <span v-if="scope.row[k] && scope.row[k].includes(i.value)">{{ i.label }}&nbsp;</span>
                  </span>
                </span>
              </span>
              <span v-else-if="s.type === 'string' && s.enum && s.enum.length">
                <span v-if="s.enumGroups && s.enumGroups.length">
                  <span v-for="(g, i) in s.enumGroups" :key="i">
                    <span v-if="scope.row[g.assocEnum.property] === g.assocEnum.value
                      ">
                      <span v-for="(e, v) in s.enum" :key="v">
                        <span v-if="e.group === g.id && scope.row[k] === e.value">{{ e.label }}</span>
                      </span>
                    </span>
                  </span>
                </span>
                <span v-else>
                  <span v-for="(i, v) in s.enum" :key="v">
                    <span v-if="scope.row[k] === i.value">{{ i.label }}</span>
                  </span>
                </span>
              </span>
              <span v-else-if="s.type === 'string' && s.oneOf && s.oneOf.length">
                <span v-if="s.enumGroups && s.enumGroups.length">
                  <span v-for="(g, i) in s.enumGroups" :key="i">
                    <span v-if="scope.row[g.assocEnum.property] === g.assocEnum.value
                      ">
                      <span v-for="(e, v) in s.oneOf" :key="v">
                        <span v-if="e.group === g.id && scope.row[k] === e.value">{{ e.label }}</span>
                      </span>
                    </span>
                  </span>
                </span>
                <span v-else>
                  <span v-for="(i, v) in s.oneOf" :key="v">
                    <span v-if="scope.row[k] === i.value">{{ i.label }}</span>
                  </span>
                </span>
              </span>
              <div class="max-h-16 overflow-y-auto" v-else>
                {{ scope.row[k] }}
              </div>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" width="140" class-name="tmw-opt__column">
            <template #default="scope">
              <el-button type="primary" link size="small" @click.stop="previewDocument(scope.row)">查看</el-button>
              <el-button v-if="docOperations.edit" type="primary" link size="small" @click.stop="editDocument(scope.row)"
                class="ml-0">修改</el-button>
              <el-dropdown class="tmw-opt__dropdown">
                <el-button type="primary" link size="small">更多
                  <el-icon class="el-icon--right"><arrow-down /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item>
                      <el-button v-if="docOperations.copy" type="primary" link size="small"
                        @click="copyDocument(scope.row)">复制</el-button>
                    </el-dropdown-item>
                    <el-dropdown-item>
                      <el-button v-if="docOperations.remove" type="danger" link size="small"
                        @click="removeDocument(scope.row)">删除</el-button>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex flex-row gap-4 p-2 items-center justify-between">
          <span class="tmw-pagination__text">已选中 {{ selectedDocuments.length }} 条数据</span>
          <div class="flex flex-row gap-4">
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
          <el-button v-if="docOperations.create" @click="createDocument">添加文档</el-button>
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
#tables :deep(tr.current-row > td.tmw-table__cell) {
  @apply text-red-400;
}
</style>

<style lang="scss">
.tmw-opt__column {
  .cell {
    @apply flex flex-row justify-between;

    .el-button+.el-button {
      margin-left: 0;
    }
  }
}
</style>

<script setup lang="ts">
import { onMounted, reactive, ref, computed, toRaw } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, ArrowDown } from '@element-plus/icons-vue'
import { Batch } from 'tms-vue3'
import * as _ from 'lodash'
import * as Handlebars from 'handlebars'
import apiCollection from '@/apis/collection'
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
  PAGINATION_DOC_SIZE
} from '@/global'

import facStore from '@/store'
import { openSelectConditionEditor } from '@/components/editor'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { ElTable } from 'element-plus'
import { useMitt } from '@/composables/mitt'
import { useAssistant } from '@/composables/assistant'
import DocPreviewJson from '@/components/DocPreviewJson.vue'
import { useDocPreviewJson } from '@/composables/docPreviewJson'
import TmwPlugins from '@/components/PluginList.vue'
import TmwPluginWidget from '@/components/PluginWidget.vue'
import { useTmwPlugins } from '@/composables/plugins'

const COMPACT = computed(() => COMPACT_MODE())
const EXTRACT = computed(() => EXTRACT_MODE())
const MULTIPLE = computed(() => MULTIPLE_MODE())
const DbLabel = computed(() => LABEL('database', '数据库'))

const store = facStore()

// 查找条件下拉框分页包含记录数（筛选下拉框没有分页所以设置分页值太小会导致加载不完数据）
// const LIST_DB_PAGE_SIZE = 100

let collection = reactive({
  schema_tags: [] as any[],
  schema_default_tags: [] as any[],
  schema: {
    body: { properties: {} },
  },
  custom: {
    docOperations: {} as any
  }
})
const docOperations = reactive({
  create: true,
  edit: true,
  remove: true,
  editMany: true,
  removeMany: true,
  transferMany: true,
  import: true,
  export: true,
  copyMany: true,
  copy: true
})
const props = defineProps({
  bucketName: { type: String, defalut: '' },
  dbName: { type: String, default: '' },
  clName: { type: String, default: '' },
  tmsAxiosName: { type: String, default: 'mongodb-api' },
})
const { bucketName, dbName, clName } = props

const data = reactive({
  docBatch: new Batch(() => { }),
  properties: {} as any,
  plugins: [] as any[],
  filter: reactive({}),
})

const tableRef = ref<InstanceType<typeof ElTable>>()

const selectedDocuments = ref<any[]>([])
const totalByAll = computed(() =>
  Object.keys(data.filter).length ? 0 : data.docBatch.total
)
const totalByFilter = computed(() =>
  Object.keys(data.filter).length ? data.docBatch.total : 0
)
const totalByChecked = computed(() => selectedDocuments.value.length)

const handleCondition = () => {
  const conditions = store.conditions
  let criterais = {
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

const handleFilter = (schema: any, name: any) => {
  openSelectConditionEditor({
    bucket: bucketName,
    db: dbName,
    cl: clName,
    columnName: name,
    schema: schema,
    conditions: store.conditions,
    onBeforeClose: (result?: any) => {
      const { condition, isClear, isCheckBtn } = result
      store.conditionAddColumn({ condition })
      // 获取界面所有元素
      const elementImgs: any = document.querySelectorAll('#tables thead img')
      let currentEle: any = Array.from(elementImgs).find(
        (ele: any) => ele.getAttribute('data-id') === name
      )
      if (isClear) {
        store.conditionDelColumn({ condition })
        currentEle.src = new URL(
          '../assets/imgs/icon_filter.png',
          import.meta.url
        ).href
      } else if (isCheckBtn) {
        store.conditionDelBtn({ columnName: name })
        const filename =
          '../assets/imgs/icon_' + condition.rule.orderBy[name] + '_active.png'
        currentEle.src = new URL(filename, import.meta.url).href
      } else {
        currentEle.src = new URL(
          '../assets/imgs/icon_filter_active.png',
          import.meta.url
        ).href
      }
      // 如果选择升降序规则，则需重置其他图标
      if (isCheckBtn) {
        store.conditions.forEach((conEle: any) => {
          const name = conEle.columnName
          let currentEle: any = Array.from(elementImgs).find(
            (ele: any) => ele.getAttribute('data-id') === name
          )
          if (
            conEle.rule &&
            conEle.rule.filter &&
            conEle.rule.filter[name] &&
            conEle.rule.filter[name].keyword
          ) {
            currentEle.src = new URL(
              '../assets/imgs/icon_filter_active.png',
              import.meta.url
            ).href
          } else if (conEle.bySort) {
            const filename =
              '../assets/imgs/icon_' +
              condition.rule.orderBy[name] +
              '_active.png'
            currentEle.src = new URL(filename, import.meta.url).href
          } else {
            currentEle.src = new URL(
              '../assets/imgs/icon_filter.png',
              import.meta.url
            ).href
          }
        })
      }
      listDocByKw()
    },
  })
}

const handleSelectionChange = (rows: any) => {
  selectedDocuments.value = rows
}

const currentRow = ref()

const handleCurrentChange = (row: any) => {
  currentRow.value = row
}

const handleRowClick = (row: any) => {
  //@ts-ignore
  tableRef.value!.toggleRowSelection(row)
}

const router = useRouter()

const createDocument = () => {
  router.push({ name: 'docEditor', params: { dbName, clName } })
}
/**
 * 通过预览窗口快速编辑文档
 * @param document
 */
const previewDocument = (document: any) => {
  const onSave = (newDoc: any) => {
    apiDoc.update(bucketName, dbName, clName, document._id, newDoc).then(() => {
      Object.assign(document, newDoc)
      ElMessage.success({ showClose: true, message: '修改成功' })
    })
  }
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
      if (checkedDocument)
        msg.document = toRaw(checkedDocument)
    }
    // 如果插件没有指定schema，传递集合的schema
    msg.schema ??= toRaw(collection.schema.body)
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
  const { opened } = useAssistant({
    extract: true,
    dbName: 'e2e5gmx_addrbook',
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
const setTableColumnsFromSchema = async () => {
  let matchedSchema = {}
  let properties: any = collection.schema.body.properties

  if (collection.schema_default_tags && collection.schema_default_tags.length) {
    matchedSchema = await listSchemaByTag(collection.schema_default_tags)
  } else if (collection.schema_tags && collection.schema_tags.length) {
    matchedSchema = await listSchemaByTag(collection.schema_tags)
  } else if (properties && typeof properties === 'object') {
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
        doc: toRaw(currentRow.value),
      })
    } else {
      let docs = selectedDocuments.value.map((d) => toRaw(d))
      emitter.emit('extract.confirm.result', { dbName, clName, docs })
    }
  })
}

onMounted(async () => {
  collection = await apiCollection.byName(bucketName, dbName, clName)
  data.plugins = await apiPlugin.getCollectionDocPlugins(
    bucketName,
    dbName,
    clName
  )
  /**集合定制功能设置 */
  const { custom } = collection
  if (custom) {
    const { docOperations: docOps } = collection.custom
    /**支持的文档操作 */
    if (docOps && typeof docOps === 'object') {
      if (docOps.create === false) docOperations.create = false
      if (docOps.edit === false) docOperations.edit = false
      if (docOps.remove === false) docOperations.remove = false
      if (docOps.editMany === false) docOperations.editMany = false
      if (docOps.removeMany === false) docOperations.removeMany = false
      if (docOps.transferMany === false) docOperations.transferMany = false
      if (docOps.import === false) docOperations.import = false
      if (docOps.export === false) docOperations.export = false
      if (docOps.copyMany === false) docOperations.copyMany = false
      if (docOps.copy === false) docOperations.copy = false
    }
  }
  await setTableColumnsFromSchema()
  listDocByKw()
})
onBeforeRouteLeave((to, from) => {
  /**
   * 离开页面时，清空store中的文档列表数据
   */
  store.documents.splice(0, store.documents.length)
})
</script>