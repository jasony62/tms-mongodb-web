<template>
  <div class="flex flex-col gap-2 mt-4 mx-4 h-full">
    <!--header-->
    <el-form>
      <el-radio-group v-model="activeTab">
        <el-radio-button label="database">数据库</el-radio-button>
        <el-radio-button label="docSchemas">文档内容定义</el-radio-button>
        <el-radio-button label="dbSchemas">数据库属性定义</el-radio-button>
        <el-radio-button label="colSchemas">集合属性定义</el-radio-button>
        <el-radio-button label="tag">标签</el-radio-button>
        <el-radio-button label="replica">全量复制定义</el-radio-button>
        <el-radio-button label="files" v-if="externalFsUrl">文件管理</el-radio-button>
      </el-radio-group>
    </el-form>
    <!--content-->
    <div class="flex flex-row flex-grow gap-2 pb-4">
      <div :class="COMPACT ? 'w-full' : 'w-4/5'">
        <div v-show="activeTab === 'database'" class="flex flex-col gap-2">
          <el-table :data="store.dbs" stripe @selection-change="changeDbSelect">
            <el-table-column type="selection" width="55"></el-table-column>
            <el-table-column label="数据库" width="180">
              <template #default="scope">
                <router-link :to="{ name: 'database', params: { dbName: scope.row.name } }">{{  scope.row.name  }}
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
            <span>已选中 {{  criteria.multipleDb.length  }} 条数据</span>
            <el-pagination layout="total, sizes, prev, pager, next" background :total="criteria.dbBatch.total"
              :page-sizes="[10, 25, 50, 100]" :current-page="criteria.dbBatch.page" :page-size="criteria.dbBatch.size"
              @current-change="changeDbPage" @size-change="changeDbSize"></el-pagination>
          </div>
        </div>
        <div v-show="activeTab === 'docSchemas'" class="flex flex-col gap-2">
          <el-table :data="store.documentSchemas" stripe>
            <el-table-column label="名称" width="180">
              <template #default="scope">
                <router-link
                  :to="{ name: 'schemaEditor', params: { bucketName, scope: 'document', schemaId: scope.row._id } }">{{
                   scope.row.title  }}
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
        <div v-show="activeTab === 'dbSchemas'" class="flex flex-col gap-2">
          <el-table :data="store.dbSchemas" stripe>
            <el-table-column prop="title" label="名称" width="180" @cell-click=""></el-table-column>
            <el-table-column prop="description" label="说明"></el-table-column>
            <el-table-column label="操作" width="180">
              <template #default="scope">
                <el-button type="primary" link size="small" @click="editSchema(scope.row, 'dbSchemas')">修改</el-button>
                <el-button type="primary" link size="small" @click="removeSchema(scope.row)">删除</el-button>
                <el-button type="primary" link size="small" @click="copySchema(scope.row, scope.$index, true)">复制
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div v-show="activeTab === 'colSchemas'" class="flex flex-col gap-2">
          <el-table :data="store.collectionSchemas" stripe>
            <el-table-column prop="title" label="名称" width="180"></el-table-column>
            <el-table-column prop="description" label="说明"></el-table-column>
            <el-table-column label="操作" width="180">
              <template #default="scope">
                <el-button type="primary" link size="small" @click="editSchema(scope.row, 'colSchemas')">修改</el-button>
                <el-button type="primary" link size="small" @click="removeSchema(scope.row)">删除</el-button>
                <el-button type="primary" link size="small" @click="copySchema(scope.row, scope.$index, true)">复制
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div v-show="activeTab === 'tag'" class="flex flex-col gap-2">
          <el-table :data="store.tags" stripe>
            <el-table-column prop="name" label="名称"></el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="primary" link size="small" @click="removeTag(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <div v-show="activeTab === 'replica'">
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
            <span>已选中 {{  criteria.multipleReplica.length  }} 条数据</span>
            <el-pagination layout="total, sizes, prev, pager, next" background :total="criteria.replicaBatch.total"
              :page-sizes="[10, 25, 50, 100]" :current-page="criteria.replicaBatch.page"
              :page-size="criteria.replicaBatch.size" @current-change="changeReplicaPage"
              @size-change="changeReplicaSize">
            </el-pagination>
          </div>
        </div>
        <div v-if="externalFsUrl" v-show="activeTab === 'files'" class="flex flex-col gap-2 h-full">
          <iframe id="iframe" width="100%" height="100%" frameborder="0" :src="externalFsUrl" marginwidth="0"
            marginheight="0" scrolling="no"></iframe>
        </div>
      </div>
      <!--right-->
      <div v-if="!COMPACT">
        <el-button @click="createDb" v-if="activeTab === 'database'">添加数据库</el-button>
        <el-button @click="createSchema('document')" v-else-if="activeTab === 'docSchemas'">添加文档列定义</el-button>
        <el-button @click="createSchema('db')" v-else-if="activeTab === 'dbSchemas'">添加数据库属性定义</el-button>
        <el-button @click="createSchema('collection')" v-else-if="activeTab === 'colSchemas'">添加集合属性定义</el-button>
        <el-button @click="createTag" v-else-if="activeTab === 'tag'">添加标签</el-button>
        <el-button @click="createReplica" v-else-if="activeTab === 'replica'">配置复制关系</el-button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Batch } from 'tms-vue3'
import { useRouter } from 'vue-router'

import facStore from '@/store'
import { openDbEditor, openTagEditor, openReplicaEditor, openSchemaEditor } from '@/components/editor'
import { EXTERNAL_FS_URL, getLocalToken, COMPACT_MODE } from '@/global'

const COMPACT = computed(() => COMPACT_MODE())

const store = facStore()

const router = useRouter()

// 查找条件下拉框分页包含记录数
const LIST_DB_PAGE_SIZE = 100
const LIST_RP_PAGE_SIZE = 100

// 文件服务地址
const externalFsUrl = computed(() => {
  let fsUrl = EXTERNAL_FS_URL()
  if (fsUrl) {
    fsUrl += fsUrl.indexOf('?') === -1 ? '?' : '&'
    fsUrl += `access_token=${getLocalToken()}`
    fsUrl += '&pickFile=no'
  }
  return fsUrl
})

const props = defineProps({ bucketName: String })

const activeTab = ref('database')
const criteria = reactive({
  dbBatch: new Batch(() => { }),
  multipleDb: [],
  replicaBatch: new Batch(() => { }),
  multipleReplica: []
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
  listDbByKw(null)
  store.listSchema({ bucket, scope: 'document' })
  // store.listSchema({ bucket: props.bucketName, scope: 'db' })
  // store.listSchema({ bucket: props.bucketName, scope: 'collection' })
  store.listTags({ bucket })
  listRpByKw(null)
})
</script>
