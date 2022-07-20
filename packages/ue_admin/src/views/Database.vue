<template>
  <div class="flex flex-col gap-2">
    <!--header-->
    <div class="h-12 py-4 px-2">
      <el-breadcrumb separator-class="el-icon-arrow-right">
        <el-breadcrumb-item :to="{ name: 'home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ dbName }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <!--content-->
    <div class="flex flex-row gap-2">
      <!--left-->
      <div class="w-4/5 flex flex-col gap-4">
        <el-table :data="store.collections" stripe @selection-change="changeClSelect">
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column label="集合名称" width="180">
            <template #default="scope">
              <router-link :to="{ name: 'collection', params: { dbName, clName: scope.row.name } }">{{ scope.row.name }}
              </router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="名称" width="180"></el-table-column>
          <el-table-column label="集合类型" width="180">
            <template #default="scope">
              <span>{{ "usage" in scope.row ? scope.row.usage == 1 ? "从集合" : "普通集合" : "" }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="说明"></el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="scope">
              <el-button @click="editCollection(scope.row, scope.$index)" type="primary" link size="small">修改
              </el-button>
              <el-button @click="removeCollection(scope.row)" type="primary" link size="small">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex flex-row gap-4 p-2 items-center justify-between">
          <span>已选中 {{ data.multipleCl.length }} 条数据</span>
          <el-pagination layout="total, sizes, prev, pager, next" background :total="data.clBatch.total"
            :page-sizes="[10, 25, 50, 100]" :current-page="data.clBatch.page" :page-size="data.clBatch.size"
            @current-change="changeClPage" @size-change="changeClSize"></el-pagination>
        </div>
      </div>
      <!--right-->
      <div>
        <el-button @click="createCollection">添加集合</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Batch } from 'tms-vue3'

import facStore from '@/store'
import { openCollectionEditor, } from '@/components/editor'
import { ElMessage, ElMessageBox } from 'element-plus';

const store = facStore()

// 查找条件下拉框分页包含记录数
const LIST_PAGE_SIZE = 100

const props = defineProps(['bucketName', 'dbName'])

const data = reactive({
  clBatch: new Batch(() => { }),
  multipleCl: [] as any[]
})

onMounted(() => {
  listClByKw()
})

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
const changeClSelect = ((val: any[]) => {
  data.multipleCl = val
})
</script>
