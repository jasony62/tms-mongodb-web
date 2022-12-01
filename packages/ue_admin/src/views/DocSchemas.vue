<template>
  <div class="flex flex-row gap-2 h-full">
    <div :class="COMPACT ? 'w-full' : 'w-4/5'">
      <div class="flex flex-col gap-2">
        <el-table :data="store.documentSchemas" stripe>
          <el-table-column label="名称" width="180">
            <template #default="scope">
              <router-link
                :to="{ name: 'schemaEditor', params: { bucketName, scope: 'document', schemaId: scope.row._id } }">
                {{
                    scope.row.title
                }}
              </router-link>
            </template>
          </el-table-column>
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
      <el-button @click="createSchema('document')">添加文档列定义</el-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Batch } from 'tms-vue3'
import { useRouter } from 'vue-router'

import facStore from '@/store'
import { openSchemaEditor } from '@/components/editor'
import { COMPACT_MODE } from '@/global'

const COMPACT = computed(() => COMPACT_MODE())

const store = facStore()

const router = useRouter()

const props = defineProps({ bucketName: String })

const criteria = reactive({
  dbBatch: new Batch(() => { }),
  multipleDb: [],
  replicaBatch: new Batch(() => { }),
  multipleReplica: []
})
const createSchema = (scope: string) => {
  // openSchemaEditor({
  //   bucketName: props.bucketName,
  //   schema: { scope, body: { type: 'object' } },
  //   onBeforeClose: (newSchema?: any) => {
  //     if (newSchema)
  //       store.appendSchema({ schema: newSchema })
  //   }
  // })
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
onMounted(() => {
  let bucket = props.bucketName
  store.listSchema({ bucket, scope: 'document' })
})
</script>
