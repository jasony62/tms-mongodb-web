<template>
  <div class="flex flex-col gap-2">
    <!--header-->
    <div class="h-12 py-4 px-2">
      <el-breadcrumb separator-class="el-icon-arrow-right">
        <el-breadcrumb-item :to="{ name: 'databases' }">数据库</el-breadcrumb-item>
        <el-breadcrumb-item>{{ dbName }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <!--content-->
    <div class="flex flex-row gap-2">
      <!--left-->
      <div class="flex flex-col gap-4" :class="COMPACT ? 'w-full' : 'w-4/5'">
        <el-table :data="store.collections" row-key="_id" stripe>
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
      </div>
      <!--right-->
      <div v-if="!COMPACT">
        <el-button @click="createCollection">添加集合</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { onMounted, reactive, computed } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { Batch } from 'tms-vue3'

import facStore from '@/store'
import { openCollectionEditor, } from '@/components/editor'
import { ElMessage, ElMessageBox } from 'element-plus'
import { COMPACT_MODE } from '@/global'

const COMPACT = computed(() => COMPACT_MODE())

const store = facStore()
const router = useRouter()

// 查找条件下拉框分页包含记录数
const LIST_PAGE_SIZE = 10000

const props = defineProps(['bucketName', 'dbName'])

const data = reactive({
  clBatch: new Batch(() => { })
})

onMounted(() => {
  listClByKw()
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
  openCollectionEditor({
    mode: 'create',
    bucketName: props.bucketName,
    dbName: props.dbName,
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
const listClByKw = ((keyword?: string) => {
  data.clBatch = store.listCollection({
    bucket: props.bucketName,
    db: props.dbName,
    keyword: keyword,
    size: LIST_PAGE_SIZE
  })
})
</script>
