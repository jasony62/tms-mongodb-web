<template>
  <div class="flex flex-col gap-2">
    <!--header-->
    <div class="h-12 py-4 px-2">
      <el-breadcrumb :separator-icon="ArrowRight">
        <el-breadcrumb-item :to="{ name: 'databases' }">{{ DbLabel }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{ dbName }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <!--content-->
    <div class="flex flex-row gap-2">
      <!--right-->
      <div class="flex flex-col items-start space-y-3 w-1/6" v-if="!COMPACT && data.clDirs?.length">
        <div v-if="currentClDir">
          <el-button type="primary" @click="removeCurrentClDir">{{ currentClDir.full_name }}<el-icon
              class="el-icon--right">
              <Close />
            </el-icon></el-button>
        </div>
        <div>
          <el-tree ref="treeClDirsRef" :data="data.clDirs" node-key="_id" :props="ClDirTreeProps"
            @current-change="handleClDirCurrentChange" />
        </div>
      </div>
      <!--left or middle-->
      <div class="flex flex-col gap-4" :class="MiddleWidthStyleClass">
        <el-table :data="store.collections" row-key="_id" stripe @selection-change="changeClSelect">
          <el-table-column type="selection" width="48"></el-table-column>
          <el-table-column label="集合名称">
            <template #default="scope">
              <el-link :underline="false" @click="openCollection(dbName, scope.row)">{{ scope.row.name }}</el-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" width="180"></el-table-column>
          <el-table-column label="集合类型" width="180">
            <template #default="scope">
              <span>{{ "usage" in scope.row ? scope.row.usage == 1 ? "从集合" : "普通集合" : "" }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="说明"></el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button @click="editCollection(scope.row, scope.$index)" type="primary" link size="small">修改
              </el-button>
              <el-dropdown class="tmw-opt__dropdown">
                <el-button type="primary" link size="small">更多
                  <el-icon class="el-icon--right"><arrow-down /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item>
                      <el-button type="danger" link size="small" @click="removeCollection(scope.row)">删除集合</el-button>
                    </el-dropdown-item>
                    <el-dropdown-item>
                      <el-button type="danger" link size="small" @click="emptyCollection(scope.row)">清空集合</el-button>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex flex-row gap-4 p-2 items-center justify-between">
          <span class="tmw-pagination__text">已选中 {{ data.multipleCl.length }} 条数据</span>
        </div>
      </div>
      <!--right-->
      <div class="flex flex-col items-start space-y-3" v-if="!COMPACT">
        <el-button @click="createCollection">添加集合</el-button>
        <tmw-plugins :plugins="plugins" :total-by-all="totalByAll" :total-by-filter="totalByFilter"
          :total-by-checked="totalByChecked" :handle-plugin="handlePlugin"></tmw-plugins>
      </div>
    </div>
  </div>
  <tmw-plugin-widget></tmw-plugin-widget>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowRight } from '@element-plus/icons-vue'
import { onMounted, reactive, computed, ref, toRaw } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { Batch } from 'tms-vue3'

import facStore from '@/store'
import { openCollectionEditor, } from '@/components/editor'
import { ElMessage, ElMessageBox, ElTree } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import { COMPACT_MODE, LABEL, BACK_API_URL, FS_BASE_URL, getLocalToken, PAGINATION_COL_SIZE } from '@/global'
import apiPlugin from '@/apis/plugin'
import apiSchema from '@/apis/schema'
import TmwPlugins from '@/components/PluginList.vue'
import TmwPluginWidget from '@/components/PluginWidget.vue'
import { useTmwPlugins } from '@/composables/plugins'
import * as _ from 'lodash'

const COMPACT = computed(() => COMPACT_MODE())
const DbLabel = computed(() => LABEL('database', '数据库'))

const store = facStore()
const router = useRouter()

const props = defineProps(['bucketName', 'dbName'])

const totalByAll = computed(() => data.clBatch.total)
const totalByFilter = computed(() => 0)
const totalByChecked = computed(() => data.multipleCl.length)

const MiddleWidthStyleClass = computed(() => {
  return COMPACT.value ? 'full' : data.clDirs?.length ? 'w-4/6' : 'w-4/5'
})

const plugins = ref([])

const data = reactive({
  clBatch: new Batch(() => { }),
  multipleCl: [] as any[],
  clDirs: [] as any[]
})
/**
 * 集合分类树上选择节点
 */
const treeClDirsRef = ref<InstanceType<typeof ElTree>>()
const ClDirTreeProps = {
  children: 'children',
  label: 'title',
}
const currentClDir = ref()
const handleClDirCurrentChange = (data: any) => {
  const clicked = toRaw(data)
  currentClDir.value = currentClDir.value === clicked ? null : clicked
  listClByKw()
}
const removeCurrentClDir = () => {
  treeClDirsRef.value?.setCurrentKey(undefined)
  currentClDir.value = null
}

onMounted(async () => {
  listClDir()
  listClByKw()
  plugins.value = await apiPlugin.getCollectionPlugins(
    props.bucketName, props.dbName
  )
})
onBeforeRouteLeave((to, from) => {
  /**
   * 离开页面时，清空store中的集合列表数据
   */
  store.collections.splice(0, store.collections.length)
})

const openCollection = (dbName: string, row: any) => {
  if (!row.schema_id) return ElMessageBox.alert('需给集合补充文档内容定义的配置，方便管理文档')
  router.push({ name: 'collection', params: { dbName, clName: row.name } })
}
const createCollection = (() => {
  const dirFullName = currentClDir.value ? currentClDir.value.full_name : ''
  openCollectionEditor({
    mode: 'create',
    bucketName: props.bucketName,
    dbName: props.dbName,
    dirFullName,
    onBeforeClose: (newCollection?: any) => {
      if (newCollection) {
        store.appendCollection({ collection: newCollection })
        listClByKw()
      }
    }
  })
})
const editCollection = ((collection: any, index: number) => {
  openCollectionEditor({
    mode: 'update',
    bucketName: props.bucketName,
    dbName: props.dbName,
    collection,
    onBeforeClose: (newCollection?: any) => {
      if (newCollection) {
        store.updateCollection({ collection: newCollection, index })
        listClByKw()
      }
    }
  })
})
const removeCollection = ((collection: any) => {
  if (collection.children && collection.children.length) {
    ElMessage({ message: '存在子集不允许删除', type: 'error' })
    return
  }

  ElMessageBox.confirm(
    `是否要删除集合【${collection.title}(${collection.name})】?`,
    `请确认`,
    {
      confirmButtonText: '是',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      store.removeCollection({
        bucket: props.bucketName,
        db: props.dbName,
        collection
      }).then(() => {
        ElMessage({ message: '集合已删除', type: 'success' })
        listClByKw()
      })
    }).catch(() => { })
})
const emptyCollection = ((collection: any) => {
  ElMessageBox.confirm(
    `是否要清除集合【${collection.title}(${collection.name})】中的文档?`,
    `请确认`,
    {
      confirmButtonText: '是',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      store.emptyCollection({
        bucket: props.bucketName,
        db: props.dbName,
        collection
      }).then(() => {
        ElMessage({ message: '集合已清空', type: 'success' })
        listClByKw()
      })
    }).catch(() => { })
})
const changeClSelect = (value: any[]) => {
  data.multipleCl = value
}
/**
 * 设置插件操作的文档参数
 */
const setPluginDocParam = (docScope: string) => {
  if (docScope === 'all') {
    return { filter: 'ALL' }
  } else if (docScope === 'checked') {
    let ids = data.multipleCl.map((collection: any) => collection._id)
    return { ids }
  }
}
const onExecute = (plugin: any,
  docScope = '',
  widgetResult = undefined,
  widgetHandleResponse = false,
  widgetDefaultHandleResponseRequired = false,
  applyAccessTokenField = '') => {
  let postBody: any
  if (plugin.amount === 'one') {
    let checkedColl
    if (data.multipleCl.length === 1) {
      checkedColl = toRaw(data.multipleCl[0])
    } else if (store.collections.length === 1) {
      checkedColl = toRaw(store.collections[0])
    }
    if (!checkedColl) return Promise.reject('没有获得要操作的文档')
    //if (data.multipleCl.length !== 1) return
    let rawCl = toRaw(checkedColl)
    postBody = { _id: rawCl._id, name: rawCl.name, sysname: rawCl.sysname, type: 'collection' }
  } else {
    if (['all', 'filter', 'checked'].includes(docScope))
      postBody = setPluginDocParam(docScope)
    else postBody = {}
  }

  // 携带插件部件的数据
  if (widgetResult && typeof widgetResult === 'object') {
    if (applyAccessTokenField && typeof applyAccessTokenField === 'string') {
      let field: string = _.get(widgetResult, applyAccessTokenField)
      if (typeof field === 'string') {
        let accessToken = getLocalToken() ?? ''
        /**只有访问自己的后端服务时才添加*/
        if (field.indexOf(BACK_API_URL()) === 0) {
          field += field.indexOf('?') > 0 ? '&' : '?'
          field += `access_token=${accessToken}`
          _.set(widgetResult, applyAccessTokenField, field)
        } else {
          _.set(widgetResult, applyAccessTokenField, accessToken)
        }
      }
    }
    postBody.widget = widgetResult
  }
  // 插件执行的基础参数
  let queryParams: any = {
    bucket: props.bucketName ?? '',
    plugin: plugin.name,
    db: props.dbName
  }
  if (plugin.amount === 'one')
    queryParams.cl = postBody.name

  // 执行插件方法
  return apiPlugin.execute(queryParams, postBody).then((result: any) => {
    if (widgetHandleResponse) {
      return result
    }
    if (typeof result === 'string') {
      /**返回字符串直接显示内容*/
      ElMessage.success({
        message: result,
        showClose: true,
      })
      listClByKw()
    } else if (result && typeof result === 'object') {
      /**返回的是对象*/
      if (result.type === 'documents') {
        /**返回的是文档数据*/
        let nInserted = 0,
          nModified = 0,
          nRemoved = 0
        let { inserted, modified, removed } = result
        /**在当前文档列表中移除删除的记录 */
        if (Array.isArray(removed) && (nRemoved = removed.length)) {
          let dbs = store.dbs.filter(
            (doc) => !removed.includes(doc._id)
          )
          store.dbs = dbs
        }
        /**在当前文档列表中更新修改的记录 */
        if (Array.isArray(modified) && (nModified = modified.length)) {
          let map = modified.reduce((m, doc) => {
            if (doc._id && typeof doc._id === 'string') m[doc._id] = doc
            return m
          }, {})
          store.dbs.forEach((doc: any, index: number) => {
            let newDb = map[doc._id]
            if (newDb) Object.assign(doc, newDb)
            // store.updateDocument({ index, document: doc })
          })
        }
        /**在当前文档列表中添加插入的记录 */
        if (Array.isArray(inserted) && (nInserted = inserted.length)) {
          inserted.forEach((newDb) => {
            if (newDb._id && typeof newDb._id === 'string')
              store.dbs.unshift(newDb)
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
          listClByKw()
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
      listClByKw()
    }
    return 'ok'
  })
}
const listClByKw = ((keyword?: string) => {
  data.clBatch = store.listCollection({
    bucket: props.bucketName,
    db: props.dbName,
    dirFullName: currentClDir.value?.full_name,
    keyword,
    size: PAGINATION_COL_SIZE()
  })
})
const listClDir = (async () => {
  data.clDirs = await store.listCollectionDir({
    bucket: props.bucketName,
    db: props.dbName,
  })
})
/**
 * 插件
 */
const { handlePlugin } = useTmwPlugins({
  bucketName: props.bucketName,
  onExecute,
  onCreate: async (plugin: any, msg: any) => {
    if (
      plugin.amount === 'one' &&
      data.multipleCl.length === 1
    ) {
      // 处理单个集合时，将集合对象传递给插件
      const cl = toRaw(data.multipleCl[0])
      cl.schema = await apiSchema.get(props.bucketName, cl.schema_id)
      msg.collection = cl
    }
  },
  onClose: () => {
    listClByKw()
  }
})
</script>
