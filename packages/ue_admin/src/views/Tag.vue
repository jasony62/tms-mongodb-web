<template>
  <div class="flex flex-row gap-2 h-full">
    <!--content-->
    <div :class="COMPACT ? 'w-full' : 'w-4/5'">
      <div class="flex flex-col gap-2">
        <el-table :data="store.tags" stripe>
          <el-table-column prop="name" label="名称"></el-table-column>
          <el-table-column prop="purpose" label="用途"></el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button type="primary" link size="small" @click="removeTag(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    <!--right-->
    <div v-if="!COMPACT">
      <el-button @click="createTag">添加标签</el-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import facStore from '@/store'
import { openTagEditor } from '@/components/editor'
import { COMPACT_MODE } from '@/global'

const COMPACT = computed(() => COMPACT_MODE())

const store = facStore()

const props = defineProps({ bucketName: String })

const createTag = () => {
  openTagEditor({
    mode: 'create',
    bucketName: props.bucketName,
    onBeforeClose: (newTag?: any) => {
      if (newTag)
        store.appendTag({ tag: newTag })
    }
  })
}
const editTag = (tag: any, index: any) => {
  // const editor = new Vue(TagEditor)
  // editor.open('update', props.bucketName, tag).then((newTag: any) => {
  //   store.updateTag({ tag: newTag, index })
  // })
}
const removeTag = (tag: { name: any }) => {
  ElMessageBox.confirm(
    `是否要删除标签【${tag.name}】?`,
    `请确认`,
    {
      confirmButtonText: '是',
      cancelButtonText: '取消',
      type: 'warning',

    }).then(() => {
      store.removeTag({ bucket: props.bucketName, tag }).then(() => {
        ElMessage({ message: '标签已删除', type: 'success' })
      })
    }).catch(() => { })
}

onMounted(() => {
  let bucket = props.bucketName
  store.listTags({ bucket })
})
</script>
