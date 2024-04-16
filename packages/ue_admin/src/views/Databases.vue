<template>
  <div class="flex flex-row gap-2 h-full">
    <!--left-->
    <div class="flex flex-col gap-2" :class="COMPACT ? 'w-full' : 'w-4/5'">
      <el-table :data="store.dbs" stripe @selection-change="changeDbSelect">
        <el-table-column type="selection" width="40"></el-table-column>
        <el-table-column label="数据库" width="180">
          <template #default="scope">
            <el-button type="primary" link size="small" @click="openDatabase(scope.row)">{{ scope.row.name
              }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button type="primary" link size="small" @click="editDb(scope.row, scope.$index)">设置</el-button>
            <el-dropdown class="tmw-opt__dropdown">
              <el-button type="primary" link size="small">更多
                <el-icon class="el-icon--right"><arrow-down /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item>
                    <el-button type="primary" link @click="gotoDocSchemas(scope.row)">进入文档定义</el-button>
                  </el-dropdown-item>
                  <el-dropdown-item>
                    <el-button type="primary" link @click="gotoDir(scope.row)">设置分类目录</el-button>
                  </el-dropdown-item>
                  <el-dropdown-item>
                    <el-button type="primary" link @click="gotoAcl(scope.row)">设置访问控制</el-button>
                  </el-dropdown-item>
                  <el-dropdown-item divided>
                    <el-button type="danger" link @click="removeDb(scope.row)">删除数据库</el-button>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
      <div class="flex flex-row gap-4 p-2 items-center justify-between">
        <span class="tmw-pagination__text">已选中 {{ criteria.multipleDb.length }} 条数据</span>
        <el-pagination :hide-on-single-page="true" layout="total, sizes, prev, pager, next" background
          :total="criteria.dbBatch.total" :page-sizes="[10, 25, 50, 100]" :current-page="criteria.dbBatch.page"
          :page-size="criteria.dbBatch.size" @current-change="changeDbPage" @size-change="changeDbSize"></el-pagination>
      </div>
    </div>
    <!--right-->
    <div class="flex flex-col items-start space-y-3" v-if="!COMPACT">
      <div>
        <el-button @click="createDb">添加数据库</el-button>
      </div>
      <tmw-plugins :plugins="plugins" :total-by-all="totalByAll" :total-by-filter="totalByFilter"
        :total-by-checked="totalByChecked" :handle-plugin="handlePlugin"></tmw-plugins>
    </div>
  </div>
  <tmw-plugin-widget></tmw-plugin-widget>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Batch } from 'tms-vue3'

import facStore from '@/store'
import { openDbEditor } from '@/components/editor'
import { BACK_API_URL, COMPACT_MODE, FS_BASE_URL, getLocalToken, LABEL, PAGINATION_DB_SIZE } from '@/global'
import apiPlugin from '@/apis/plugin'
import TmwPlugins from '@/components/PluginList.vue'
import TmwPluginWidget from '@/components/PluginWidget.vue'
import { useTmwPlugins } from '@/composables/plugins'
import * as _ from 'lodash'
import { useRouter } from 'vue-router'

const COMPACT = computed(() => COMPACT_MODE())

const router = useRouter()

const store = facStore()

// 查找条件下拉框分页包含记录数

const props = defineProps({ bucketName: String })

const criteria = reactive({
  dbBatch: new Batch(() => { }),
  multipleDb: [] as any[],
})
const listDbByKw = (keyword: any) => {
  criteria.dbBatch = store.listDatabase({
    bucket: props.bucketName,
    keyword: keyword,
    size: PAGINATION_DB_SIZE()
  })
}
const createDb = () => {
  openDbEditor({
    mode: 'create',
    bucketName: props.bucketName,
    onBeforeClose: (newDb?: any) => {
      if (newDb)
        store.appendDatabase({ db: newDb })
    }
  })
}
const editDb = (db: any, index: any) => {
  openDbEditor({
    mode: 'update',
    bucketName: props.bucketName,
    database: JSON.parse(JSON.stringify(toRaw(db))),
    onBeforeClose: (newDb?: any) => {
      if (newDb)
        store.updateDatabase({ db: newDb, index })
    }
  })
}
const removeDb = (db: any) => {
  ElMessageBox.confirm(
    `是否要删除数据库【${db.title}(${db.name})】?`,
    `请确认`,
    {
      confirmButtonText: '是',
      cancelButtonText: '取消',
      type: 'warning',

    }).then(() => {
      store.removeDb({ bucket: props.bucketName, db }).then(() => {
        ElMessage({ message: '数据库已删除', type: 'success' })
      })
    }).catch(() => { })
}
const changeDbPage = (page: any) => {
  criteria.dbBatch.goto(page)
}
const changeDbSize = (size: any) => {
  criteria.dbBatch.size = size
  criteria.dbBatch.goto(1)
}
const changeDbSelect = (value: any[]) => {
  criteria.multipleDb = value
}

/**
 * 设置插件操作的文档参数
 */
const setPluginDocParam = (docScope: string) => {
  if (docScope === 'all') {
    return { filter: 'ALL' }
  } else if (docScope === 'checked') {
    let ids = criteria.multipleDb.map((document: any) => document._id)
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
    if (criteria.multipleDb.length !== 1) return
    let rawDb = toRaw(criteria.multipleDb[0])
    postBody = { _id: rawDb._id, name: rawDb.name, sysname: rawDb.sysname, type: 'database' }
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
    bucket: props.bucketName ?? '',
    plugin: plugin.name,
  }

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
      listDbByKw(null)
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
          listDbByKw(null)
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
      listDbByKw(null)
    }
    return 'ok'
  })
}
/**
 * 插件
 */
const { handlePlugin } = useTmwPlugins({
  bucketName: props.bucketName,
  onExecute,
  onCreate: (plugin: any, msg: any) => {
    if (
      plugin.amount === 'one' &&
      criteria.multipleDb.length === 1
    ) {
      // 处理单个文档时，将文档数据
      msg.database = toRaw(criteria.multipleDb[0])
    }
  },
  onClose: () => {
    listDbByKw(null)
  }
})
/**
 * 
 * @param db 
 */
const openDatabase = (db: any) => {
  if (db.spreadsheet === 'yes') {
    router.push({ name: 'spreadsheet', params: { dbName: db.name } })
  } else {
    router.push({ name: 'database', params: { dbName: db.name } })
  }
}
const gotoDocSchemas = (db: any) => {
  router.push({ name: 'databaseDocSchemas', params: { bucketName: props.bucketName, dbName: db.name } })
}
const gotoAcl = (db: any) => {
  router.push({ name: 'databaseAcl', params: { bucketName: props.bucketName, dbName: db.name } })
}
const gotoDir = (db: any) => {
  router.push({ name: 'databaseDir', params: { bucketName: props.bucketName, dbName: db.name } })
}
const totalByAll = computed(() => criteria.dbBatch.total)
const totalByFilter = computed(() => 0)
const totalByChecked = computed(() => criteria.multipleDb.length)

const plugins = ref([])

onMounted(async () => {
  listDbByKw(null)
  let bucket = props.bucketName
  plugins.value = await apiPlugin.getDatabasePlugins(
    bucket,
  )
})
</script>
