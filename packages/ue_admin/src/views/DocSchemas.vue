<template>
  <div class="flex flex-row gap-2 h-full">
    <div :class="COMPACT ? 'w-full' : 'w-4/5'">
      <div class="flex flex-col gap-2">
        <el-table :data="topSchemas" row-key="_id" stripe>
          <el-table-column label="定义名称" width="240">
            <template #default="scope">
              <router-link
                :to="{ name: 'schemaEditor', params: { bucketName, scope: 'document', schemaId: scope.row._id } }">
                {{
    scope.row.name
}}
              </router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="名称" width="180"></el-table-column>
          <el-table-column prop="description" label="说明"></el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="scope">
              <el-button type="primary" link size="small" @click="editSchema(scope.row, 'document')">修改</el-button>
              <el-button type="primary" link size="small" @click="removeSchema(scope.row)">删除</el-button>
              <el-button type="primary" link size="small" @click="copySchema(scope.row, scope.$index, true)">复制
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    <!--right-->
    <div v-if="!COMPACT">
      <el-button @click="createSchema('document')">添加文档字段定义</el-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, toRaw } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import facStore from '@/store'
import { openSchemaEditor } from '@/components/editor'
import { COMPACT_MODE } from '@/global'

const COMPACT = computed(() => COMPACT_MODE())

const store = facStore()

const router = useRouter()

const props = defineProps({
  bucketName: String,
  dbName: { type: String, default: '' }
})

const createSchema = (scope: string) => {
  router.push({ name: 'schemaEditor', params: { bucketName: props.bucketName, scope: scope } })
}
const editSchema = (schema: any, scope: string) => {
  store.documentSchemas = [schema]
  router.push({ name: 'schemaEditor', params: { bucketName: props.bucketName, scope: scope, schemaId: schema._id } })
}
const copySchema = (schema: any, index: any, isCopy = false) => {
  let newObj = { ...schema }
  if (isCopy) {
    newObj.title = newObj.title + '-复制'
    delete newObj._id
  }
  openSchemaEditor({
    bucketName: props.bucketName,
    schema: JSON.parse(JSON.stringify(toRaw(newObj))),
    onBeforeClose: (newSchema?: any) => {
      if (newSchema)
        if (isCopy) {
          store.appendSchema({ schema: newSchema })
        } else {
          store.updateSchema({ schema: newSchema, index })
        }
    }
  })
}
const removeSchema = (schema: { title: string }) => {
  ElMessageBox.confirm(
    `是否要删除文档列定义【${schema.title}】?`,
    `请确认`,
    {
      confirmButtonText: '是',
      cancelButtonText: '取消',
      type: 'warning',

    }).then(() => {
      store.removeSchema({ bucket: props.bucketName, schema }).then(() => {
        ElMessage({ message: '文档列定义已删除', type: 'success' })
      })
    }).catch(() => { })
}

// 顶层schema定义
const topSchemas = ref<any[]>([])

onMounted(() => {
  const bucket = props.bucketName
  const db = props.dbName
  store.listSchema({ bucket, db, scope: 'document' }).then(({ schemas }: { schemas: any }) => {
    // 添加辅助字段方便列表显示
    let cache = new Map<string, any>()
    let allChildren: any[] = []
    schemas.forEach((s: any) => {
      let cloned = JSON.parse(JSON.stringify(s))
      cache.set(s.name, cloned)
      // topSchemas.value.push(cloned)
      if (!cloned.parentName) topSchemas.value.push(cloned)
      else allChildren.push(cloned)
    })
    allChildren.forEach((s: any) => {
      let { parentName } = s
      if (parentName && typeof parentName === 'string' && cache.has(parentName)) {
        let ps = cache.get(parentName)
        ps.children ??= []
        ps.children.push(s)
      }
    })
  })
})
</script>
