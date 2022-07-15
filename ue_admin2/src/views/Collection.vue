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
        <el-table :data="store.documents" highlight-current-row stripe style="width: 100%;"
          @current-change="handleCurrentChange" @selection-change="handleSelectionChange">
          <el-table-column type="index" width="55"></el-table-column>
          <el-table-column type="selection" width="55" />
          <el-table-column v-for="(s, k, i) in data.properties" :key="i" :prop="k">
            <template #header>
              <div @click="handleFilter(s, k)" :class="{ 'active': currentNames.includes(k) }">
                <i v-if="s.required" style="color: red">*</i>
                <span>{{ s.title }}</span>
                <el-icon class="el-icon__filter">
                  <Filter />
                </el-icon>
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
              <el-button type="primary" text size="small" @click="editDocument(scope.row, scope.$index)">修改</el-button>
              <el-button type="primary" text size="small" @click="removeDocument(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex flex-row gap-4 p-2 items-center">
          <span>已选中 {{ data.multipleDoc.length }} 条数据</span>
          <el-pagination layout="total, sizes, prev, pager, next" background :total="data.docBatch.total"
            :page-sizes="[10, 25, 50, 100]" :current-page="data.docBatch.page" :page-size="data.docBatch.size"
            @current-change="changeDocPage" @size-change="changeDocSize"></el-pagination>
        </div>
      </div>
      <div>
        <tms-flex direction="column" align-items="flex-start">
          <div>
            <el-button @click="createDocument">添加文档</el-button>
          </div>
          <div>
            <el-button @click="exportJSON">导出文档(JSON)</el-button>
          </div>
          <div v-if="data.jsonItems.length">
            <el-button v-for="item in data.jsonItems" plain @click="configJson(item)">编辑【{{
                item.title
            }}】
            </el-button>
          </div>
        </tms-flex>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, toRaw, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight, Filter } from '@element-plus/icons-vue'
import { Batch } from 'tms-vue3'

import apiCollection from '@/apis/collection'
import apiSchema from '@/apis/schema'
import apiDoc from '@/apis/document'
import apiPlugin from '@/apis/plugin'
import { getLocalToken } from '@/global'

import facStore from '@/store'
import {
  openDocEditor,
  openConfigJsonEditor,
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
})
const { bucketName, dbName, clName } = props

const data = reactive({
  docBatch: new Batch(() => { }),
  multipleDoc: [] as any[],
  jsonItems: [] as any[],
  properties: {} as any,
  documents: [] as any[],
  plugins: [] as any[]
})

let currentNames = ref([] as any[])
let currentDocument = ref<any>(null)
let selectedDocuments = ref<any[]>([])
let totalChecked = computed(() => selectedDocuments.value.length)

const handlePlugins = (plugin: any, type?: string) => {

}

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
      if (isCheckBtn) store.conditionDelBtn({ columnName: name })
      if (isClear) store.conditionDelColumn({ condition })
      // 待处理：排序降序后的图标颜色不变；是因为点击的target不一定是哪个元素；
      listDocByKw()
    },
  })
}

const hasJsonItems = () => {
  for (let propertyName in data.properties) {
    let value = data.properties[propertyName]
    if (value.type === 'json') {
      // 自定义'name'键值接收原property
      value.name = propertyName
      data.jsonItems.push(value)
    }
  }
}

const configJson = (item: any) => {
  let row = currentDocument.value
  if (!row) return
  let jsonData = row[item.name]
  openConfigJsonEditor({
    jsonData,
    onBeforeClose: (newJson?: any) => {
      row[item.name] = newJson
      apiDoc.update(
        bucketName,
        dbName,
        clName,
        row._id,
        row
      )
    },
  })
}

const handleCurrentChange = (row: any) => {
  currentDocument.value = row
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
  data.plugins = await apiPlugin.getPlugins(bucketName, dbName, clName)
  await handleProperty()
  hasJsonItems()
  listDocByKw()
})
</script>
