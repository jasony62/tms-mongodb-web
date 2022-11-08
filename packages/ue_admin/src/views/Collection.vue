<template>
  <div class="flex flex-col gap-2">
    <!--header-->
    <div class="h-12 py-4 px-2">
      <el-breadcrumb :separator-icon="ArrowRight">
        <el-breadcrumb-item :to="{ name: 'home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'database', params: { dbName: dbName } }">{{ dbName }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{ clName }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <!--content-->
    <div class="flex flex-row gap-2">
      <div class="flex flex-col gap-4" :class="COMPACT ? 'w-full' : 'w-4/5'">
        <el-table id="tables" ref="tableRef" :data="store.documents" highlight-current-row stripe
          @selection-change="handleSelectionChange" @row-click="handleRowClick">
          <el-table-column fixed="left" type="index" width="48"></el-table-column>
          <el-table-column type="selection" width="40" />
          <el-table-column type="expand" width="40">
            <template #default="props">
              <div v-html="renderDocManual(props.row)"></div>
            </template>
          </el-table-column>
          <el-table-column v-for="(s, k, i) in data.properties" :key="i" :prop="k">
            <template #header>
              <div @click="handleFilter(s, k)">
                <span v-if="s.required" class="text-red-400">*</span>
                <span>{{ s.title }}</span>
                <img :data-id="k" class="w-4 h-4 inline-block" src="../assets/imgs/icon_filter.png">
              </div>
            </template>
            <template #default="scope">
              <span v-if="s.type === 'boolean'">{{ scope.row[k] ? '是' : '否' }}</span>
              <span v-else-if="s.type === 'array' && s.items && s.items.format === 'file'">
                <span v-for="(i, v) in scope.row[k]" :key="v">
                  <el-link type="primary" @click="downLoadFile(i)">{{ i.name }}</el-link>
                  <br />
                </span>
              </span>
              <span v-else-if="s.type === 'array' && s.enum && s.enum.length">
                <span v-if="s.enumGroups && s.enumGroups.length">
                  <span v-for="(g, i) in s.enumGroups" :key="i">
                    <span v-if="scope.row[g.assocEnum.property] === g.assocEnum.value">
                      <span v-for="(e, v) in s.enum" :key="v">
                        <span
                          v-if="e.group === g.id && scope.row[k] && scope.row[k].length && scope.row[k].includes(e.value)">{{
                          e.label
                          }}&nbsp;</span>
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
                    <span v-if="scope.row[g.assocEnum.property] === g.assocEnum.value">
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
                    <span v-if="scope.row[g.assocEnum.property] === g.assocEnum.value">
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
              <div class="max-h-16 overflow-y-auto" v-else>{{ scope.row[k] }}</div>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" width="180">
            <template #default="scope">
              <el-button type="primary" link size="small" @click="editDocument(scope.row)">修改</el-button>
              <el-button type="primary" link size="small" @click="removeDocument(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex flex-row gap-4 p-2 items-center justify-between">
          <span>已选中 {{ data.multipleDoc.length }} 条数据</span>
          <el-pagination layout="total, sizes, prev, pager, next" background :total="data.docBatch.total"
            :page-sizes="[10, 25, 50, 100]" :current-page="data.docBatch.page" :page-size="data.docBatch.size"
            @current-change="changeDocPage" @size-change="changeDocSize"></el-pagination>
        </div>
      </div>
      <div class="flex flex-col items-start space-y-3" v-if="!COMPACT">
        <div>
          <el-button @click="createDocument">添加文档</el-button>
        </div>
        <div v-for="p in data.plugins" :key="p.name">
          <el-button v-if="p.amount === 'zero'" type="success" plain @click="handlePlugin(p)">{{ p.title }}
          </el-button>
          <el-button v-else-if="p.amount === 'one'" :disabled="totalByChecked !== 1" type="success" plain
            @click="handlePlugin(p)">{{ p.title }}
          </el-button>
          <el-dropdown v-else>
            <el-button type="success" plain>{{ p.title }}
              <el-icon class="el-icon--right">
                <arrow-down />
              </el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>
                  <el-button text @click="handlePlugin(p, 'all')" :disabled="totalByAll === 0">
                    按全部({{ totalByAll }})</el-button>
                </el-dropdown-item>
                <el-dropdown-item>
                  <el-button text @click="handlePlugin(p, 'filter')" :disabled="totalByFilter === 0">
                    按筛选({{ totalByFilter }})</el-button>
                </el-dropdown-item>
                <el-dropdown-item>
                  <el-button text @click="handlePlugin(p, 'checked')" :disabled="totalByChecked === 0">
                    按选中({{ totalByChecked }})</el-button>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>
  </div>
  <el-drawer v-model="showPluginWidget" :size="pluginWidgetSize" :with-header="false" :show-close="false"
    :close-on-click-modal="false" :destroy-on-close="true">
    <div class="h-full w-full relative">
      <iframe ref="elPluginWidget" class="plugin-widget" :src="pluginWidgetUrl"></iframe>
    </div>
  </el-drawer>
</template>

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
import { getLocalToken, COMPACT_MODE, FS_BASE_URL, BACK_API_URL, DOC_MANUAL } from '@/global'

import facStore from '@/store'
import {
  openSelectConditionEditor,
} from '@/components/editor'
import { useRouter } from 'vue-router'
import { ElTable } from 'element-plus'

const COMPACT = computed(() => COMPACT_MODE())

const elPluginWidget = ref<HTMLIFrameElement>()
const showPluginWidget = ref(false)
const pluginWidgetUrl = ref('')
const pluginWidgetSize = ref('')

const store = facStore()

// 查找条件下拉框分页包含记录数
const LIST_DB_PAGE_SIZE = 100

let collection = reactive({
  schema_tags: [] as any[],
  schema_default_tags: [] as any[],
  schema: {
    body: { properties: {} },
  },
})
const props = defineProps({
  bucketName: { type: String, defalut: '' },
  dbName: { type: String, default: '' },
  clName: { type: String, default: '' },
  tmsAxiosName: { type: String, default: 'mongodb-api' }
})
const { bucketName, dbName, clName } = props

const data = reactive({
  docBatch: new Batch(() => { }),
  multipleDoc: [] as any[],
  properties: {} as any,
  documents: [] as any[],
  plugins: [] as any[],
  filter: reactive({})
})

const tableRef = ref<InstanceType<typeof ElTable>>()

const selectedDocuments = ref<any[]>([])
const totalByAll = computed(() => Object.keys(data.filter).length ? 0 : data.docBatch.total)
const totalByFilter = computed(() => Object.keys(data.filter).length ? data.docBatch.total : 0)
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
      let currentEle: any = Array.from(elementImgs).find((ele: any) => ele.getAttribute('data-id') === name)
      if (isClear) {
        store.conditionDelColumn({ condition })
        currentEle.src = new URL('../assets/imgs/icon_filter.png', import.meta.url).href
      } else if (isCheckBtn) {
        store.conditionDelBtn({ columnName: name })
        const filename = '../assets/imgs/icon_' + condition.rule.orderBy[name] + '_active.png'
        currentEle.src = new URL(filename, import.meta.url).href
      } else {
        currentEle.src = new URL('../assets/imgs/icon_filter_active.png', import.meta.url).href
      }
      // 如果选择升降序规则，则需重置其他图标
      if (isCheckBtn) {
        store.conditions.forEach((conEle: any) => {
          const name = conEle.columnName
          let currentEle: any = Array.from(elementImgs).find((ele: any) => ele.getAttribute('data-id') === name)
          if (
            conEle.rule &&
            conEle.rule.filter &&
            conEle.rule.filter[name] &&
            conEle.rule.filter[name].keyword
          ) {
            currentEle.src = new URL('../assets/imgs/icon_filter_active.png', import.meta.url).href
          } else if (conEle.bySort) {
            const filename = '../assets/imgs/icon_' + condition.rule.orderBy[name] + '_active.png'
            currentEle.src = new URL(filename, import.meta.url).href
          } else {
            currentEle.src = new URL('../assets/imgs/icon_filter.png', import.meta.url).href
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

const handleRowClick = (row:any)=>{
  tableRef.value!.toggleRowSelection(row,undefined) 
}

const router = useRouter()

const createDocument = () => {
  router.push({ name: 'docEditor', params: { dbName, clName } })
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
/**
 * 文档对象的说明
 */
const renderDocManual = (doc: any) => {
  const tpl = DOC_MANUAL(dbName, clName)
  const html = Handlebars.compile(tpl)({ bucketName: bucketName ?? '', dbName, clName, doc })
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
function executePlugin(plugin: any, docScope = '', widgetResult = undefined, widgetHandleResponse = false, applyAccessTokenField = '') {
  let postBody: any
  if (plugin.amount === 'one') {
    if (selectedDocuments.value.length !== 1) return
    postBody = { docId: toRaw(selectedDocuments.value[0]._id) }
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
  let queryParams = { bucket: bucketName ?? '', db: dbName, cl: clName, plugin: plugin.name }

  // 执行插件方法
  return apiPlugin
    .execute(queryParams, postBody)
    .then((result: any) => {
      if (widgetHandleResponse) {
        return result
      }
      if (typeof result === 'string') {
        /**返回字符串直接显示内容*/
        ElMessage.success({
          message: result, showClose: true,
        })
        listDocByKw()
      } else if (result && typeof result === 'object') {
        /**返回的是对象*/
        if (result.type === 'documents') {
          /**返回的是文档数据*/
          let nInserted = 0, nModified = 0, nRemoved = 0
          let { inserted, modified, removed } = result
          /**在当前文档列表中移除删除的记录 */
          if (Array.isArray(removed) && (nRemoved = removed.length)) {
            let documents = data.documents.filter((doc) => !removed.includes(doc._id))
            store.documents = documents
          }
          /**在当前文档列表中更新修改的记录 */
          if (Array.isArray(modified) && (nModified = modified.length)) {
            let map = modified.reduce((m, doc) => {
              if (doc._id && typeof doc._id === 'string') m[doc._id] = doc
              return m
            }, {})
            data.documents.forEach((doc: any, index: number) => {
              let newDoc = map[doc._id]
              if (newDoc) Object.assign(doc, newDoc)
              store.updateDocument({ index, document: doc })
            })
          }
          /**在当前文档列表中添加插入的记录 */
          if (Array.isArray(inserted) && (nInserted = inserted.length)) {
            inserted.forEach((newDoc) => {
              if (newDoc._id && typeof newDoc._id === 'string')
                data.documents.unshift(newDoc)
            })
          }
          let msg = `插件[${plugin.title}]执行完毕，添加[${nInserted}]条，修改[${nModified}]条，删除[${nRemoved}]条记录。`
          ElMessage.success({ message: msg })
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
      return 'ok'
    })
}
/**
 * 执行插件
 * 
 * @param plugin 要执行的插件 
 * @param docScope 插件操作数据的范围
 */
const handlePlugin = (plugin: any, docScope = '') => {
  const { beforeWidget } = plugin
  if (beforeWidget) {
    const { name, url, size } = beforeWidget
    if (name === 'external' && url) {
      let fullurl = url + (url.indexOf('?') > 0 ? '&' : '?')
      showPluginWidget.value = true
      pluginWidgetUrl.value = fullurl + `bucket=${bucketName ?? ''}&db=${dbName}&cl=${clName}`
      pluginWidgetSize.value = size ?? '50%'
      // 收集页面数据
      const widgetResultListener = (event: MessageEvent) => {
        const { data, origin } = event
        if (data) {
          const { action, result, handleResponse, applyAccessTokenField, reloadOnClose } = data
          if (action === 'Created') {
            // 插件创建成功后，将插件信息传递给插件
            if (elPluginWidget.value) {
              const msg: any = { plugin: { name: toRaw(plugin.name), ui: toRaw(beforeWidget.ui) } }
              if (plugin.amount === 'one' && selectedDocuments.value.length === 1) {
                // 处理单个文档时，将文档数据和schema传递给插件
                msg.document = toRaw(selectedDocuments.value[0])
                msg.schema = toRaw(collection.schema.body)
              }
              elPluginWidget.value.contentWindow?.postMessage(msg, '*')
            }
          } else if (action === 'Cancel') {
            window.removeEventListener('message', widgetResultListener)
            showPluginWidget.value = false
          } else if (action === 'Execute') {
            executePlugin(plugin, docScope, result, handleResponse, applyAccessTokenField).then((response: any) => {
              if (handleResponse === true) {
                // 将执行的结果递送给插件
                if (elPluginWidget.value) {
                  elPluginWidget.value.contentWindow?.postMessage({ response }, '*')
                }
              } else {
                window.removeEventListener('message', widgetResultListener)
                showPluginWidget.value = false
              }
            })
          } else if (action === 'Close') {
            window.removeEventListener('message', widgetResultListener)
            showPluginWidget.value = false
            // 关闭后刷新数据
            if (reloadOnClose) listDocByKw()
          }
        }
      }
      window.addEventListener('message', widgetResultListener)
      return
    }
  } else {
    executePlugin(plugin, docScope)
  }
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
  let properties = collection.schema.body.properties

  if (collection.schema_default_tags && collection.schema_default_tags.length) {
    matchedSchema = await listSchemaByTag(collection.schema_default_tags)
  } else if (collection.schema_tags && collection.schema_tags.length) {
    matchedSchema = await listSchemaByTag(collection.schema_tags)
  } else if (properties && typeof properties === 'object') {
    Object.assign(matchedSchema, properties)
  }

  data.properties = Object.freeze(matchedSchema)
}

const listDocByKw = () => {
  const criterais = handleCondition()
  data.docBatch = store.listDocument({
    bucket: bucketName,
    db: dbName,
    cl: clName,
    size: LIST_DB_PAGE_SIZE,
    criterais
  })
}

onMounted(async () => {
  collection = await apiCollection.byName(bucketName, dbName, clName)
  data.plugins = await apiPlugin.getCollectionDocPlugins(bucketName, dbName, clName)
  await setTableColumnsFromSchema()
  listDocByKw()
})
</script>
<style scoped lang="scss">
.plugin-widget {
  border: 0;
  @apply h-full w-full;
}
</style>