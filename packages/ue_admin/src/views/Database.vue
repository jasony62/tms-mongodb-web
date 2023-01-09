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
        <el-table :data="store.collections" stripe>
          <el-table-column type="selection" width="40"></el-table-column>
          <el-table-column type="expand" width="40">
            <template #default="props">
            </template>
          </el-table-column>
          <el-table-column label="集合名称" width="180">
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
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex flex-row gap-4 p-2 items-center justify-between">
          <el-pagination layout="total, sizes, prev, pager, next" background :total="data.clBatch.total"
            :page-sizes="[10, 25, 50, 100]" :current-page="data.clBatch.page" :page-size="data.clBatch.size"
            @current-change="changeClPage" @size-change="changeClSize"></el-pagination>
        </div>
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
import { useRouter } from 'vue-router'
import { Batch } from 'tms-vue3'

import facStore from '@/store'
import { openCollectionEditor, } from '@/components/editor'
import { ElMessage, ElMessageBox } from 'element-plus'
import { COMPACT_MODE } from '@/global'

const COMPACT = computed(() => COMPACT_MODE())

const store = facStore()
const router = useRouter()

// 查找条件下拉框分页包含记录数
const LIST_PAGE_SIZE = 100

const props = defineProps(['bucketName', 'dbName'])

const data = reactive({
  clBatch: new Batch(() => { })
})

onMounted(() => {
  listClByKw()
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
      if (newCollection)
        store.appendCollection({ collection: newCollection })
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
      if (newCollection)
        store.updateCollection({ collection: newCollection, index })
    }
  })
})
const removeCollection = ((collection: any) => {
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
const changeClPage = ((page: number) => {
  data.clBatch.goto(page)
})
const changeClSize = ((size: number) => {
  data.clBatch.size = size
  data.clBatch.goto(1)
})
</script>
