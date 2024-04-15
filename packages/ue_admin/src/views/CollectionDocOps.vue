<template>
  <el-button type="primary" link size="small" @click.stop="handle('preview')">查看</el-button>
  <el-button v-if="HasDocEditRight" type="primary" link size="small" @click.stop="handle('edit')"
    class="ml-0">修改</el-button>
  <el-dropdown class="tmw-opt__dropdown" v-if="HasDocEditRight">
    <el-button type="primary" link size="small">更多
      <el-icon class="el-icon--right"><arrow-down /></el-icon>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-if="Collection.docAclCheck">
          <el-button @click="handle('acl')" type="primary" link size="small">访问控制</el-button>
        </el-dropdown-item>
        <el-dropdown-item>
          <el-button type="primary" link size="small" @click="handle('copy')">复制</el-button>
        </el-dropdown-item>
        <el-dropdown-item divided>
          <el-button type="danger" link size="small" @click="handle('remove')">删除</el-button>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'

const emit = defineEmits(['preview', 'edit', 'copy', 'remove', 'acl'])

const props = defineProps({
  Collection: { type: Object, required: true },
  doc: { type: Object }
})

const HasDocEditRight = computed(() => {
  const { right } = props.Collection
  if (!right || (Array.isArray(right) && right.length === 0)) return true

  if (Array.isArray(right) && !right.includes('readDoc')) return true

  return false
})

const handle = (name: any) => {
  emit(name, props.doc)
}

</script>