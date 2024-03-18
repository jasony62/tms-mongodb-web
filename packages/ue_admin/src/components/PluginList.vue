<template>
  <div v-for="p in plugins" :key="p.name">
    <el-button v-if="p.amount === 'zero'" type="success" plain @click="handlePlugin(p)">{{ p.title }}
    </el-button>
    <div v-else-if="p.amount === 'one'">
      <el-button :disabled="!(totalByChecked === 1 || docslen === 1)" type="success" plain @click="handlePlugin(p)">{{
    p.title
  }}</el-button>
    </div>
    <el-dropdown v-else>
      <el-button type="success" plain>{{ p.title }}
        <el-icon class="el-icon--right">
          <arrow-down />
        </el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item>
            <el-button text @click="handlePlugin(p, 'all')" :disabled="totalByAll === 0">
              按全部({{ totalByAll }})</el-button>
          </el-dropdown-item>
          <el-dropdown-item>
            <el-button text @click="handlePlugin(p, 'filter')" :disabled="totalByFilter === 0">
              按筛选({{ totalByFilter }})</el-button>
          </el-dropdown-item>
          <el-dropdown-item>
            <el-button text @click="handlePlugin(p, 'checked')" :disabled="totalByChecked === 0">
              按选中({{ totalByChecked }})</el-button>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { PropType } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue'

const props = defineProps({
  plugins: { type: Array as PropType<Array<any>> },
  totalByAll: { type: Number },
  totalByFilter: { type: Number },
  totalByChecked: { type: Number },
  handlePlugin: { type: Function },
  docslen: { type: Number }
})

const handlePlugin = (plugin: any, scope = '') => {
  if (props.handlePlugin)
    props.handlePlugin(plugin, scope)
}
</script>