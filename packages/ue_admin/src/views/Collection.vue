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
      <div class="w-4/5 flex flex-col gap-4">
        <el-table id="tables" :data="store.documents" highlight-current-row stripe
          @selection-change="handleSelectionChange">
          <el-table-column fixed="left" type="index" width="48"></el-table-column>
          <el-table-column type="selection" width="48" />
          <el-table-column v-for="(s, k, i) in data.properties" :key="i" :prop="k">
            <template #header>
              <div @click="handleFilter(s, k)">
                <span v-if="s.required" class="text-red-400">*</span>
                <span>{{ s.title }}</span>
                <img :data-id="k" class="icon_filter w-4 h-4 inline-block" src="../assets/imgs/icon_filter.png">
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
              <div class="max-h-16 overflow-y-auto" v-else>{{ scope.row[k] }}</div>
            </template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" width="180">
            <template #default="scope">
              <el-button type="primary" link size="small" @click="editDocument(scope.row, scope.$index)">修改</el-button>
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
      <div class="flex flex-col items-start space-y-3">
        <div>
          <el-button @click="createDocument">添加文档</el-button>
        </div>
        <div>
          <el-button @click="exportJSON">导出文档(JSON)</el-button>
        </div>
        <div v-for="p in data.plugins" :key="p.name">
          <el-button v-if="p.transData === 'nothing'" type="success" plain @click="handlePlugins(p)">{{ p.title }}
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
                  <el-button type="" text @click="handlePlugins(p, 'all')">按全部({{ data.docBatch.total }})</el-button>
                </el-dropdown-item>
                <el-dropdown-item>
                  <el-button type="" text @click="handlePlugins(p, 'filter')">按筛选</el-button>
                </el-dropdown-item>
                <el-dropdown-item>
                  <el-button type="" text @click="handlePlugins(p, 'checked')">按选中({{ totalChecked }})</el-button>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, toRaw, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Filter, ArrowDown } from '@element-plus/icons-vue'
import { Batch } from 'tms-vue3'

import apiCollection from '@/apis/collection'
import apiSchema from '@/apis/schema'
import apiDoc from '@/apis/document'
import apiPlugin from '@/apis/plugin'
import { getLocalToken } from '@/global'

import facStore from '@/store'
import {
  openDocEditor,
  openSelectConditionEditor,
} from '@/components/editor'

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
  plugins: [] as any[]
})

let currentNames = ref([] as any[])
let selectedDocuments = ref<any[]>([])
let totalChecked = computed(() => selectedDocuments.value.length)

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

const exportJSON = () => {
  if (selectedDocuments.value.length === 0) return
  let ids = selectedDocuments.value.map((doc) => doc._id)
  apiDoc
    .export(bucketName ?? '', dbName, clName, {
      docIds: ids,
      columns: data.properties,
      exportType: 'json',
    })
    .then((result: any) => {
      const access_token = getLocalToken()
      let url = `${import.meta.env.BASE_URL.replace(/\/$/, '')}${result}?access_token=${access_token}`
      window.open(url)
    })
}

const createDocument = () => {
  openDocEditor({
    mode: 'create',
    bucketName,
    dbName,
    collection,
    onBeforeClose: (newDoc?: any) => {
      if (newDoc) store.appendDocument({ document: newDoc })
    },
  })
}

const editDocument = (document: any, index: number) => {
  openDocEditor({
    mode: 'update',
    bucketName,
    dbName,
    collection,
    document: toRaw(document),
    onBeforeClose: (newDoc?: any) => {
      if (newDoc) store.updateDocument({ document: newDoc, index })
    },
  })
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

const downLoadFile = (file: any) => {
  const access_token = getLocalToken()
  window.open(`${file.url}?access_token=${access_token}`)
}

const fnSetReqParam = (command: string) => {
  if (command === 'all') {
    return { filter: 'ALL' }
  } else if (command === 'filter') {
  } else if (command === 'checked') {
    let ids = selectedDocuments.value.map((document: any) => document._id)
    return { docIds: ids }
  }
}

const handlePlugins = (plugin: any, type: string = "") => {
  let postBody = {} as any
  if (plugin.transData && plugin.transData === 'one') {
    postBody = type
  } else {
    if (['All', 'filter', 'checked'].includes(type))
      postBody = fnSetReqParam(type)
  }
  new Promise((resolve) => {
    resolve({})
  }).then((beforeResult) => {
    if (beforeResult) {
      postBody.widget = beforeResult
    }
    let queryParams = {
      db: dbName,
      cl: clName,
      plugin: plugin.name,
      // name: plugin.name,
      // type: plugin.type, // 这个参数应该去掉，插件自己知道自己的类型
    }
    apiPlugin
      .execute(queryParams, postBody)
      .then((result: any) => {
        if (typeof result === 'string') {
          ElMessage.success({
            message: result, showClose: true,
          })
          listDocByKw()
        } else if (result && typeof result === 'object' && result.type === 'documents') {
          /**返回操作结果——数据 */
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
        } else if (
          result &&
          typeof result === 'object' &&
          result.type === 'numbers'
        ) {
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
        } else {
          ElMessage.success({
            message: `插件[${plugin.title}]执行完毕。`,
            showClose: true,
          })
          listDocByKw()
        }
      })
      .catch((err: any) => {
        ElMessage.error(err.msg)
      })
  })
}

const changeDocPage = (page: number) => {
  data.docBatch.goto(page)
}

const changeDocSize = (size: number) => {
  data.docBatch.size = size
  data.docBatch.goto(1)
}

const listTag = (tags: any) => {
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

const handleProperty = async () => {
  let temp = {}
  let properties = collection.schema.body.properties

  if (collection.schema_default_tags && collection.schema_default_tags.length) {
    temp = await listTag(collection.schema_default_tags)
  } else if (collection.schema_tags && collection.schema_tags.length) {
    temp = await listTag(collection.schema_tags)
  } else if (
    properties &&
    Object.prototype.toString.call(properties).toLowerCase() ==
    '[object object]'
  ) {
    Object.assign(temp, properties)
  }

  data.properties = Object.freeze(temp)
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
  let { bucketName, dbName, clName } = props
  collection = await apiCollection.byName(bucketName, dbName, clName)
  data.plugins = await apiPlugin.getCollectionDocPlugins(bucketName, dbName, clName)
  await handleProperty()
  listDocByKw()
})
</script>

<style>
.icon_filter {
  /* width: 14px;
  height: 14px;
  display: inline-block; */
}
</style>
