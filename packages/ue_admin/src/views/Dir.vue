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
              <el-button type="primary" link size="small" @click="editDir(scope.row)">修改</el-button>
              <el-button type="primary" link size="small" @click="removeDir(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    <!--right-->
    <div class="flex flex-col items-start space-y-3" v-if="!COMPACT">
      <div>
        <el-button @click="createDir()">添加分类目录</el-button>
      </div>
      <div>
        <el-button :disabled="!currentRow" @click="createDir(true)">添加子分类目录</el-button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { COMPACT_MODE } from '@/global'
import facStore from '@/store'
import { openDirEditor } from '@/components/editor'
import { ElMessage } from 'element-plus'

const COMPACT = computed(() => COMPACT_MODE())
const store = facStore()

const props = defineProps({
  bucketName: String,
  dbName: { type: String, default: '' }
})

const data = reactive({
  clDirs: [] as any[],
})

// 当前选中的行（分类目录）
const currentRow = ref()

const handleCurrentChange = (row: any) => {
  currentRow.value = row
}

const createDir = (dirChild = false) => {
  openDirEditor({
    mode: 'create',
    bucketName: props.bucketName,
    dbName: props.dbName,
    parentDir: dirChild ? toRaw(currentRow.value) : null,
    onBeforeClose: (newDir: any) => {
      listDir()
    }
  })
}
const editDir = (dir: any) => {
  const cloned = JSON.parse(JSON.stringify(toRaw(dir)))
  delete cloned.children
  openDirEditor({
    mode: 'update',
    bucketName: props.bucketName,
    dbName: props.dbName,
    parentDir: null,
    dir: cloned,
    onBeforeClose: (newDir: any) => {
      listDir()
    }
  })
}
const removeDir = (dir: any) => {
  const cloned = JSON.parse(JSON.stringify(toRaw(dir)))
  delete cloned.children
  store.removeCollectionDir({
    bucket: props.bucketName,
    db: props.dbName,
    clDir: cloned
  }).then(() => {
    ElMessage({ message: '分类目录目录已删除', type: 'success' })
    listDir()
  })
}
const listDir = (async () => {
  data.clDirs = await store.listCollectionDir({
    bucket: props.bucketName,
    db: props.dbName,
  })
})
onMounted(async () => {
  listDir()
})
</script>