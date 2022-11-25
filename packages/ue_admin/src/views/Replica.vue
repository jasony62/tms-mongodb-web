<template>
  <div class="flex flex-row gap-2 h-full">
    <div class="flex flex-row flex-grow gap-2 pb-4">
      <div :class="COMPACT ? 'w-full' : 'w-4/5'">
        <div>
          <el-table :data="store.replicas" stripe style="width: 100%" @selection-change="changeReplicaSelect">
            <el-table-column type="selection" width="55"></el-table-column>
            <el-table-column prop="primary.db.label" label="主数据库名称"></el-table-column>
            <el-table-column prop="primary.cl.label" label="主集合名称"></el-table-column>
            <el-table-column prop="secondary.db.label" label="从数据库名称"></el-table-column>
            <el-table-column prop="secondary.cl.label" label="从集合名称"></el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="primary" link size="small" @click="handleSyncReplica(scope.row)">同步</el-button>
                <el-button type="primary" link size="small" @click="removeReplica(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="flex flex-row gap-4 p-2 items-center justify-between">
            <span>已选中 {{ criteria.multipleReplica.length }} 条数据</span>
            <el-pagination layout="total, sizes, prev, pager, next" background :total="criteria.replicaBatch.total"
              :page-sizes="[10, 25, 50, 100]" :current-page="criteria.replicaBatch.page"
              :page-size="criteria.replicaBatch.size" @current-change="changeReplicaPage"
              @size-change="changeReplicaSize">
            </el-pagination>
          </div>
        </div>
      </div>
      <!--right-->
      <div v-if="!COMPACT">
        <el-button @click="createReplica">配置复制关系</el-button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { Batch } from 'tms-vue3'
import { useRouter } from 'vue-router'

import facStore from '@/store'
import { openReplicaEditor } from '@/components/editor'
import { COMPACT_MODE } from '@/global'

const COMPACT = computed(() => COMPACT_MODE())

const store = facStore()

const router = useRouter()

// 查找条件下拉框分页包含记录数
const LIST_RP_PAGE_SIZE = 100


const props = defineProps({ bucketName: String })

const criteria = reactive({
  dbBatch: new Batch(() => { }),
  multipleDb: [],
  replicaBatch: new Batch(() => { }),
  multipleReplica: []
})

const createReplica = () => {
  // const editor = new Vue(ReplicaEditor)
  // editor.open(props.bucketName).then((newReplica: any) => {
  //   store.appendReplica({ replica: newReplica })
  // })
  // })
  openReplicaEditor({
    bucketName: props.bucketName,
    onBeforeClose: (newReplica?: any) => {
      if (newReplica)
        store.appendReplica({ replica: newReplica })
    }
  })
}
const fnGetParams = (replica: { primary: { db: { name: any }; cl: { name: any } }; secondary: { db: { name: any }; cl: { name: any } } }) => {
  const params = {
    primary: {
      db: replica.primary.db.name,
      cl: replica.primary.cl.name
    },
    secondary: {
      db: replica.secondary.db.name,
      cl: replica.secondary.cl.name
    }
  }
  return params
}
const removeReplica = (replica: { primary: { db: { name: any }; cl: { name: any } }; secondary: { db: { name: any }; cl: { name: any } } }) => {
  const params = fnGetParams(replica)
  // this.$customeConfirm('关联关系', () => {
  //   return store.removeReplica({ bucket: props.bucketName, params })
  // })
}
const listRpByKw = (keyword: any) => {
  criteria.replicaBatch = store.listReplica({
    bucket: props.bucketName,
    keyword: keyword,
    size: LIST_RP_PAGE_SIZE
  })
}
const changeReplicaPage = (page: any) => {
  criteria.replicaBatch.goto(page)
}
const changeReplicaSize = (size: any) => {
  criteria.replicaBatch.size = size
  criteria.replicaBatch.goto(1)
}
const changeReplicaSelect = (value: never[]) => {
  criteria.multipleReplica = value
}
const handleSyncReplica = (replica: { primary: { db: { name: any }; cl: { name: any } }; secondary: { db: { name: any }; cl: { name: any } } }) => {
  const params = fnGetParams(replica)
  store.syncReplica({ bucket: props.bucketName, params }).then(() => {
    ElMessage.success({ message: '同步成功' })
  })
}
const handleSyncAllReplica = () => {
  // const msg = ElMessage.info({ message: '正在同步...', duration: 0 })
  // store.synchronizeAll({
  //   bucket: props.bucketName,
  //   params: criteria.multipleReplica
  // }).then((result: { success: string | any[]; error: string | any[] }) => {
  //   msg.message = `成功${result.success.length}条,失败${result.error.length}条`
  //   msg.close()
  // })
}

onMounted(() => {
  let bucket = props.bucketName
  listRpByKw(null)
})
</script>
