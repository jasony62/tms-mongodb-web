<template>
  <div class="flex flex-row gap-2 h-full">
    <div :class="COMPACT ? 'w-full' : 'w-4/5'">
      <div class="flex flex-col gap-2">
        <el-table :data="data.clDirs" row-key="_id" stripe highlight-current-row @current-change="handleCurrentChange">
          <el-table-column prop="name" label="系统名（英文）" width="180" @cell-click=""></el-table-column>
          <el-table-column prop="title" label="显示名（中文）" width="180" @cell-click=""></el-table-column>
          <el-table-column prop="description" label="说明"></el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="scope">
              <el-button type="primary" link size="small" @click="editClDir(scope.row)">修改</el-button>
              <el-button type="primary" link size="small" @click="removeClDir(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    <!--right-->
    <div class="flex flex-col items-start space-y-3" v-if="!COMPACT">
      <div>
        <el-button @click="createClDir()">添加集合分类</el-button>
      </div>
      <div>
        <el-button :disabled="!currentRow" @click="createClDir(true)">添加集合子分类</el-button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { COMPACT_MODE } from '@/global'
import facStore from '@/store'
import { openCollectionDirEditor } from '@/components/editor'
import { ElMessage, ElMessageBox } from 'element-plus'

const COMPACT = computed(() => COMPACT_MODE())
const store = facStore()

const props = defineProps({
  bucketName: String,
  dbName: { type: String, default: '' }
})

const data = reactive({
  clDirs: [] as any[],
})

const currentRow = ref()

const currentRowFullName = () => {
  if (!currentRow.value) return ''
  let { full_name } = currentRow.value
  return full_name
}

const handleCurrentChange = (row: any) => {
  currentRow.value = row
}

const createClDir = (clDirChild = false) => {
  openCollectionDirEditor({
    mode: 'create',
    bucketName: props.bucketName,
    dbName: props.dbName,
    parentFullName: clDirChild ? currentRowFullName() : '',
    onBeforeClose: (newClDir: any) => {
      listClDir()
    }
  })
}
const editClDir = (clDir: any) => {
  const cloned = JSON.parse(JSON.stringify(toRaw(clDir)))
  delete cloned.children
  openCollectionDirEditor({
    mode: 'update',
    bucketName: props.bucketName,
    dbName: props.dbName,
    parentFullName: '',
    collectionDir: cloned,
    onBeforeClose: (newClDir: any) => {
      listClDir()
    }
  })
}
const removeClDir = (clDir: any) => {
  const cloned = JSON.parse(JSON.stringify(toRaw(clDir)))
  delete cloned.children
  store.removeCollectionDir({
    bucket: props.bucketName,
    db: props.dbName,
    clDir: cloned
  }).then(() => {
    ElMessage({ message: '集合分类目录已删除', type: 'success' })
    listClDir()
  })
}
const listClDir = (async () => {
  data.clDirs = await store.listCollectionDir({
    bucket: props.bucketName,
    db: props.dbName,
  })
})
onMounted(async () => {
  listClDir()
})
</script>