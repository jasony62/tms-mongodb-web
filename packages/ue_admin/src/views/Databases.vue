<template>
  <div class="flex flex-row gap-2 h-full">
    <div :class="COMPACT ? 'w-full' : 'w-4/5'">
      <div class="flex flex-col gap-2">
        <el-table :data="store.dbs" stripe @selection-change="changeDbSelect">
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column label="数据库" width="180">
            <template #default="scope">
              <router-link :to="{ name: 'database', params: { dbName: scope.row.name } }">{{ scope.row.name }}
              </router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="名称" width="180"></el-table-column>
          <el-table-column prop="description" label="说明"></el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button type="primary" link size="small" @click="editDb(scope.row, scope.$index)">修改</el-button>
              <el-button type="primary" link size="small" @click="removeDb(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="flex flex-row gap-4 p-2 items-center justify-between">
          <span>已选中 {{ criteria.multipleDb.length }} 条数据</span>
          <el-pagination layout="total, sizes, prev, pager, next" background :total="criteria.dbBatch.total"
            :page-sizes="[10, 25, 50, 100]" :current-page="criteria.dbBatch.page" :page-size="criteria.dbBatch.size"
            @current-change="changeDbPage" @size-change="changeDbSize"></el-pagination>
        </div>
      </div>
    </div>
    <!--right-->
    <div v-if="!COMPACT">
      <el-button @click="createDb">添加数据库</el-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, toRaw } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Batch } from 'tms-vue3'

import facStore from '@/store'
import { openDbEditor } from '@/components/editor'
import { COMPACT_MODE } from '@/global'

const COMPACT = computed(() => COMPACT_MODE())

const store = facStore()

// 查找条件下拉框分页包含记录数
const LIST_DB_PAGE_SIZE = 100

const props = defineProps({ bucketName: String })

const criteria = reactive({
  dbBatch: new Batch(() => { }),
  multipleDb: [],
})
const listDbByKw = (keyword: any) => {
  criteria.dbBatch = store.listDatabase({
    bucket: props.bucketName,
    keyword: keyword,
    size: LIST_DB_PAGE_SIZE
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
const changeDbSelect = (value: never[]) => {
  criteria.multipleDb = value
}
onMounted(() => {
  let bucket = props.bucketName
  listDbByKw(null)
})
</script>
