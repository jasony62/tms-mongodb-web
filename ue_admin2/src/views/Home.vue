<template>
  <tms-frame id="tmw-database" :display="{ header: true, footer: true, right: true }" :leftWidth="'20%'">
    <template v-slot:header></template>
    <template v-slot:center>
      <el-form>
        <el-radio-group v-model="activeTab">
          <el-radio-button label="database">数据库</el-radio-button>
          <el-radio-button label="docSchemas">文档内容定义</el-radio-button>
          <el-radio-button label="dbSchemas">数据库属性定义</el-radio-button>
          <el-radio-button label="colSchemas">集合属性定义</el-radio-button>
          <el-radio-button label="tag">标签</el-radio-button>
          <el-radio-button label="replica">全量复制定义</el-radio-button>
        </el-radio-group>
      </el-form>
      <tms-flex direction="column" v-show="activeTab === 'database'">
        <el-table :data="store.dbs" stripe style="width: 100%" @selection-change="changeDbSelect"
          :max-height="dymaicHeight">
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
              <el-button type="primary" text size="small" @click="editDb(scope.row, scope.$index)">修改</el-button>
              <el-button type="primary" text size="small" @click="removeDb(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <tms-flex class="tmw-pagination">
          <span class="tmw-pagination__text">已选中 {{ criteria.multipleDb.length }} 条数据</span>
          <el-pagination layout="total, sizes, prev, pager, next" background :total="criteria.dbBatch.total"
            :page-sizes="[10, 25, 50, 100]" :current-page="criteria.dbBatch.page" :page-size="criteria.dbBatch.size"
            @current-change="changeDbPage" @size-change="changeDbSize"></el-pagination>
        </tms-flex>
      </tms-flex>
      <el-table v-show="activeTab === 'docSchemas'" :data="store.documentSchemas" stripe style="width: 100%"
        :max-height="dymaicHeight">
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="scope">
            <el-button type="primary" text size="small" @click="editSchema(scope.row, scope.$index, true)">复制</el-button>
            <el-button type="primary" text size="small" @click="editSchema(scope.row, scope.$index)">修改</el-button>
            <el-button type="primary" text size="small" @click="removeSchema(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-table v-show="activeTab === 'dbSchemas'" :data="store.dbSchemas" stripe style="width: 100%"
        :max-height="dymaicHeight">
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button type="primary" text size="small" @click="editSchema(scope.row, scope.$index, true)">复制</el-button>
            <el-button type="primary" text size="small" @click="editSchema(scope.row, scope.$index)">修改</el-button>
            <el-button type="primary" text size="small" @click="removeSchema(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-table v-show="activeTab === 'colSchemas'" :data="store.collectionSchemas" stripe style="width: 100%"
        :max-height="dymaicHeight">
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button type="primary" text size="small" @click="editSchema(scope.row, scope.$index, true)">复制</el-button>
            <el-button type="primary" text size="small" @click="editSchema(scope.row, scope.$index)">修改</el-button>
            <el-button type="primary" text size="small" @click="removeSchema(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-table v-show="activeTab === 'tag'" :data="store.tags" stripe style="width: 100%" :max-height="dymaicHeight">
        <el-table-column prop="name" label="名称"></el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button type="primary" text size="small" @click="removeTag(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <tms-flex direction="column" v-show="activeTab === 'replica'">
        <el-table :data="store.replicas" stripe style="width: 100%" @selection-change="changeReplicaSelect"
          :max-height="dymaicHeight">
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column prop="primary.db.label" label="主数据库名称"></el-table-column>
          <el-table-column prop="primary.cl.label" label="主集合名称"></el-table-column>
          <el-table-column prop="secondary.db.label" label="从数据库名称"></el-table-column>
          <el-table-column prop="secondary.cl.label" label="从集合名称"></el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button type="primary" text size="small" @click="handleSyncReplica(scope.row)">同步</el-button>
              <el-button type="primary" text size="small" @click="removeReplica(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <tms-flex class="tmw-pagination">
          <span class="tmw-pagination__text">已选中 {{ criteria.multipleReplica.length }} 条数据</span>
          <el-pagination layout="total, sizes, prev, pager, next" background :total="criteria.replicaBatch.total"
            :page-sizes="[10, 25, 50, 100]" :current-page="criteria.replicaBatch.page"
            :page-size="criteria.replicaBatch.size" @current-change="changeReplicaPage"
            @size-change="changeReplicaSize"></el-pagination>
        </tms-flex>
      </tms-flex>
    </template>
    <template v-slot:right>
      <tms-flex direction="column" align-items="flex-start">
        <el-button @click="createDb" v-if="activeTab === 'database'">添加数据库</el-button>
        <el-button @click="createSchema('document')" v-else-if="activeTab === 'docSchemas'">添加文档列定义</el-button>
        <el-button @click="createSchema('db')" v-else-if="activeTab === 'dbSchemas'">添加数据库属性定义</el-button>
        <el-button @click="createSchema('collection')" v-else-if="activeTab === 'colSchemas'">添加集合属性定义</el-button>
        <el-button @click="createTag" v-else-if="activeTab === 'tag'">添加标签</el-button>
        <el-button @click="createReplica" v-else-if="activeTab === 'replica'">配置复制关系</el-button>
      </tms-flex>
    </template>
  </tms-frame>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref, toRaw } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Batch } from 'tms-vue3'

import facStore from '@/store'
import { openDbEditor, openTagEditor, openReplicaEditor, openSchemaEditor } from '@/components/editor'

const store = facStore()

// 查找条件下拉框分页包含记录数
const LIST_DB_PAGE_SIZE = 100
const LIST_RP_PAGE_SIZE = 100

const props = defineProps({ bucketName: String })

const activeTab = ref('database')
const dymaicHeight = ref(500)
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
  openSchemaEditor({
    bucketName: props.bucketName,
    schema: { scope, body: {} },
    onBeforeClose: (newSchema?: any) => {
      if (newSchema)
        store.appendSchema({ schema: newSchema })
    }
  })
}
const editSchema = (schema: any, index: any, isCopy = false) => {
  let newObj = { ...schema }
  if (isCopy) {
    newObj.title = newObj.title + '-复制'
    delete newObj._id
  }
  openSchemaEditor({
    bucketName: props.bucketName,
    schema: JSON.parse(JSON.stringify(toRaw(schema))),
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
  // this.$customeConfirm(schema.title, () => {
  //   return store.removeSchema({ bucket: props.bucketName, schema })
  // })
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
  //?
  // dymaicHeight.value = window.innerHeight * 0.8
  dymaicHeight.value = 300
  let bucket = props.bucketName
  listDbByKw(null)
  store.listSchema({ bucket, scope: 'document' })
  // store.listSchema({ bucket: props.bucketName, scope: 'db' })
  // store.listSchema({ bucket: props.bucketName, scope: 'collection' })
  store.listTags({ bucket })
  listRpByKw(null)
})
</script>
