<template>
  <el-dialog title="集合" v-model="dialogVisible" :destroy-on-close="true" :close-on-click-modal="false"
    :before-close="onBeforeClose">
    <div class="el-dialog-div">
      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="基本信息" name="info"></el-tab-pane>
        <el-tab-pane label="扩展信息" name="extra" v-if="clSchema._id"></el-tab-pane>
        <el-tab-pane label="设置" name="setting"></el-tab-pane>
        <el-tab-pane label="文档编辑转换规则" name="convert"></el-tab-pane>
      </el-tabs>
      <el-form :model="collection" label-position="top" v-show="activeTab === 'info'" :rules="rules">
        <el-form-item label="所属分类目录" prop="title" v-if="clDir?.full_title">
          <div>{{ clDir.full_title }}</div>
        </el-form-item>
        <el-form-item label="集合名称（系统）" prop="sysname">
          <el-input v-model="collection.sysname" :disabled="mode === 'update'"></el-input>
        </el-form-item>
        <el-form-item label="集合名称（英文）" prop="name">
          <el-input v-model="collection.name"></el-input>
        </el-form-item>
        <el-form-item label="集合显示名（中文）" prop="title">
          <el-input v-model="collection.title"></el-input>
        </el-form-item>
        <el-form-item label="集合文档内容定义（默认）" prop="schema_id">
          <el-select v-model="collection.schema_id" clearable placeholder="请选择定义名称">
            <el-option-group v-for="schema in schemas" :key="schema.label" :label="schema.label">
              <el-option v-for="item in schema.options" :key="item._id" :label="item.title" :value="item._id" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="集合文档内容定义（定制-修改）">
          <el-select v-model="collection.schema_tags" clearable multiple placeholder="请选择定义标签">
            <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="集合文档内容定义（定制-展示）">
          <el-select v-model="collection.schema_default_tags" clearable multiple placeholder="请选择定义标签">
            <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="集合标签">
          <el-select v-model="collection.tags" clearable multiple placeholder="请选择集合标签">
            <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="集合用途" prop="usage">
          <el-select v-model="collection.usage" clearable placeholder="请选择集合用途">
            <el-option label="普通集合" :value="0"></el-option>
            <el-option label="从集合" :value="1"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input type="textarea" v-model="collection.description"></el-input>
        </el-form-item>
        <el-form-item label="仅系统管理员可见">
          <el-switch v-model="collection.adminOnly"></el-switch>
        </el-form-item>
      </el-form>
      <div v-show="activeTab === 'extra'">
        <div v-if="clSchema.body">
          <tms-json-doc ref="elJdeDoc" :schema="clSchema.body" :value="collection" :hide-root-title="true"
            :hide-root-description="true"></tms-json-doc>
        </div>
      </div>
      <el-form :model="collection.custom" label-position="top" v-show="activeTab === 'setting'">
        <el-form-item label="文档操作">
          <el-checkbox v-model="collection.custom.docOperations.create">添加数据</el-checkbox>
          <el-checkbox v-model="collection.custom.docOperations.edit">修改</el-checkbox>
          <el-checkbox v-model="collection.custom.docOperations.remove">删除</el-checkbox>
          <el-checkbox v-model="collection.custom.docOperations.copy">复制</el-checkbox>
          <el-checkbox v-model="collection.custom.docOperations.editMany">批量修改</el-checkbox>
          <el-checkbox v-model="collection.custom.docOperations.removeMany">批量删除</el-checkbox>
          <el-checkbox v-model="collection.custom.docOperations.transferMany">批量迁移</el-checkbox>
          <el-checkbox v-model="collection.custom.docOperations.import">导入数据</el-checkbox>
          <el-checkbox v-model="collection.custom.docOperations.export">导出数据</el-checkbox>
          <el-checkbox v-model="collection.custom.docOperations.copyMany">批量复制</el-checkbox>
        </el-form-item>
        <el-form-item label="文档操作规则">
          <el-checkbox v-model="collection.operateRules.scope.unrepeat">添加/导入数据时去重</el-checkbox>
        </el-form-item>
        <el-form-item label="设置去重规则" v-if="collection.operateRules.scope.unrepeat === true" class="tmw-formItem__flex">
          <el-select v-model="collection.operateRules.unrepeat.database" value-key="sysname" @clear="listDbByKw"
            @change="changeDb" placeholder="请选择数据库" clearable filterable remote :remote-method="listDbByKw"
            :loading="criteria.databaseLoading">
            <el-option v-for="item in criteria.databases" :key="item._id" :label="item.label" :value="item"></el-option>
            <el-option :disabled="true" value="" v-if="criteria.dbBatch.pages > 1">
              <el-pagination :current-page="criteria.dbBatch.page" :total="criteria.dbBatch.total"
                :page-size="criteria.dbBatch.size" layout="prev, next" @current-change="changeDbPage">
              </el-pagination>
            </el-option>
          </el-select>
          <el-select v-model="collection.operateRules.unrepeat.collection" value-key="sysname" @clear="listClByKw"
            @change="changeCl" placeholder="请选择集合" clearable filterable remote :remote-method="listClByKw"
            :loading="criteria.collectionLoading">
            <el-option v-for="item in criteria.collections" :key="item._id" :label="item.label" :value="item"></el-option>
            <el-option :disabled="true" value="" v-if="criteria.clBatch.pages > 1">
              <el-pagination :current-page="criteria.clBatch.page" :total="criteria.clBatch.total"
                :page-size="criteria.clBatch.size" layout="prev, next" @current-change="changeClPage">
              </el-pagination>
            </el-option>
          </el-select>
          <el-select v-model="collection.operateRules.unrepeat.primaryKeys" placeholder="请选择列" filterable multiple>
            <el-option v-for="item in criteria.properties" :key="item.value" :label="item.label" :value="item.value">
            </el-option>
          </el-select>
          <el-select v-model="collection.operateRules.unrepeat.insert" placeholder="是否插入当前表" v-if="collection.operateRules.unrepeat.collection.sysname !==
            collection.sysname
            ">
            <el-option label="是" :value="true"></el-option>
            <el-option label="否" :value="false"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="全文检索">
          <el-checkbox v-model="collection.custom.elasticsearch.enabled">保存到Elasticsearch</el-checkbox>
        </el-form-item>
      </el-form>
      <div v-show="activeTab === 'convert'" class="h-96">
        <textarea ref="elConvEditor" class="h-full w-full border border-gray-200 p-2"
          v-model="docFieldConvertRules"></textarea>
      </div>
    </div>
    <template #footer>
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onBeforeClose">取消</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { Batch, startBatch } from 'tms-vue3'
import apiDb from '@/apis/database'
import apiCollection from '@/apis/collection'
import apiSchema from '@/apis/schema'
import apiTag from '@/apis/tag'
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import { FormRules, ElMessage, ElMessageBox } from 'element-plus'
import TmsJsonDoc, { DocAsArray } from 'tms-vue3-ui/dist/es/json-doc'
import 'tms-vue3-ui/dist/es/json-doc/style/tailwind.scss'

// 查找条件下拉框分页包含记录数
const SELECT_PAGE_SIZE = 7

const emit = defineEmits(['submit'])

const props = defineProps({
  mode: { default: '' },
  dialogVisible: { default: true },
  bucketName: { type: String, default: '' },
  dbName: { type: String, default: '' },
  clDir: { type: Object, default: { full_name: '', full_title: '' } },
  clSchema: { type: Object, default: {} },
  collection: {
    type: Object,
    default: () => {
      return {
        name: '',
        title: '',
        description: '',
        schema_id: '',
        schema_tags: [],
        schema_default_tags: [],
        tags: [],
        dir_full_name: '',
        usage: 0,
        adminOnly: false,
        custom: {
          docOperations: {
            create: true,
            edit: true,
            remove: true,
            editMany: true,
            removeMany: true,
            transferMany: true,
            import: true,
            export: true,
            copyMany: true,
            copy: true
          },
          elasticsearch: {
            enabled: false
          },
        },
        operateRules: {
          scope: {
            unrepeat: false,
          },
          unrepeat: {
            database: {},
            collection: {},
            primaryKeys: [],
            insert: false,
          },
        },
        docFieldConvertRules: {},
      }
    },
  },
  onClose: { type: Function, default: (newCl: any) => { } },
})

// 设置默认值
props.collection.custom ??= { docOperations: {}, elasticsearch: { enabled: false } }
props.collection.custom.elasticsearch ??= { enabled: false }
props.collection.operateRules ??= {
  scope: { unrepeat: false },
  unrepeat: {
    database: {},
    collection: {},
    primaryKeys: [],
    insert: false,
  },
}


const dialogVisible = ref(props.dialogVisible)
const activeTab = ref('info')
const schemas = reactive([
  {
    label: '数据库',
    options: [] as any[],
  },
  {
    label: '全局',
    options: [] as any[],
  },
])
const tags = ref([] as any[])
const criteria = reactive({
  databaseLoading: false,
  databases: [] as any[],
  dbBatch: new Batch(() => { }),
  collectionLoading: false,
  collections: [] as any[],
  clBatch: new Batch(() => { }),
  properties: {} as { [k: string]: any },
})

const { mode, bucketName, dbName, clSchema, onClose } = props
const collection = reactive(props.collection)
if (mode === 'create' && props.clDir.full_name) {
  collection.dir_full_name = props.clDir.full_name
}
// 编辑的集合对象
// 集合的原名称，用于更新操作
const clBeforeName = props.collection.name
// 文档字段映射规则
const docFieldConvertRules = computed({
  get: () => {
    let jsonStr
    try {
      jsonStr = JSON.stringify(collection.docFieldConvertRules, null, 2)
    } catch (e) {
      jsonStr = ''
    }
    return jsonStr
  },
  set: (val) => {
    try {
      let json = JSON.parse(val)
      collection.docFieldConvertRules = json
    } catch (e) {
      // 什么也不做
    }
  },
})

// 文档编辑器
const elJdeDoc = ref<{ editing: () => any; editDoc: DocAsArray } | null>(null)

onMounted(() => {
  apiSchema
    .listSimple(bucketName, 'document', dbName)
    .then((schemas2: any[]) => {
      /**
       * 分别显示数据库或全局指定的文档列定义对象
       */
      schemas2.forEach((s: any) => {
        s.db ? schemas[0].options.push(s) : schemas[1].options.push(s)
      })
    })
  apiTag.list(props.bucketName).then((tags2: any[]) => {
    tags2.forEach((t) => tags.value.push(t))
  })
  // 去重规则
  const unrepeat = props.collection?.operateRules?.unrepeat
  if (unrepeat) {
    const dbKey = unrepeat.database.name ? unrepeat.database.name : null
    listDbByKw(dbKey)
    if (dbKey) {
      const clKey = unrepeat.collection.name ? unrepeat.collection.name : null
      listClByKw(clKey)
      if (clKey) {
        listProperties()
      }
    }
  }
})

// 关闭对话框时执行指定的回调方法
const closeDialog = (newCl?: any) => {
  onClose(newCl)
}

// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog(null)
}

const rules = reactive<FormRules>({
  name: [{ required: true, message: '集合名称不允许为空' }],
  usage: [{ required: true, message: '集合用途不允许为空' }],
  schema_id: [{ required: true, message: '集合文档定义不允许为空' }]
})
const changeDb = () => {
  collection.operateRules.unrepeat.collection = {}
  criteria.clBatch = startBatch(batchCollection, [null], {
    size: SELECT_PAGE_SIZE,
  })
  changeCl()
}
const changeCl = () => {
  let { primaryKeys, collection } = props.collection.operateRules.unrepeat
  primaryKeys.splice(0, primaryKeys.length)
  if (collection && collection.sysname) {
    listProperties()
  }
}
const listProperties = () => {
  let { database, collection } = props.collection.operateRules.unrepeat
  apiCollection.byName(props.bucketName, database.name, collection.name).then(
    (result: {
      schema: {
        body: { properties: { [s: string]: any } | ArrayLike<unknown> }
      }
    }) => {
      criteria.properties = Object.entries(result.schema.body.properties).map(
        ([key, value]) => {
          return { value: key, label: `${value.title} (${key})` }
        }
      )
    }
  )
}
const listDbByKw = (keyword: string) => {
  criteria.dbBatch = startBatch(batchDatabase, [keyword], {
    size: SELECT_PAGE_SIZE,
  })
}
const changeDbPage = (page: number) => {
  criteria.dbBatch.goto(page)
}
const batchDatabase = (keyword: any, batchArg: { page: any; size: any }) => {
  criteria.databaseLoading = true
  return apiDb
    .list(props.bucketName, keyword, {
      ...batchArg,
    })
    .then((result: any) => {
      criteria.databaseLoading = false
      criteria.databases = result.databases.map(
        (db: { name: any; sysname: any; title: any }) => {
          return {
            name: db.name,
            sysname: db.sysname,
            label: `${db.title} (${db.name})`,
          }
        }
      )
      return result
    })
}
const listClByKw = (keyword: any) => {
  criteria.clBatch = startBatch(batchCollection, [keyword], {
    size: SELECT_PAGE_SIZE,
  })
}

const batchCollection = (keyword: any, batchArg: { page: any; size: any }) => {
  criteria.collectionLoading = true
  let { database } = collection.operateRules.unrepeat

  if (database.name) {
    return apiCollection
      .list(props.bucketName, database.name, {
        keyword,
        ...batchArg,
      })
      .then((result: any) => {
        criteria.collections = result.collections.map((cl: any) => {
          return {
            name: cl.name,
            sysname: cl.sysname,
            label: `${cl.title} (${cl.name})`,
          }
        })
        criteria.collectionLoading = false
        return result
      })
  } else {
    criteria.collections = []
    criteria.collectionLoading = false
    return Promise.resolve({ total: 0 })
  }
}

const changeClPage = (page: number) => {
  criteria.clBatch.goto(page)
}

const onSubmit = () => {
  const reg = /^[a-zA-z]/
  if (!reg.test(collection.name))
    return ElMessageBox.alert('请输入以英文字母开头的集合名')

  if (!collection.schema_id)
    return ElMessageBox.alert('请指定[集合内容定义(默认)]的值')

      //清除附加字段
      ;['schema_name', 'schema_order', 'schema_parentName', 'children'].forEach(item => {
        if (collection.hasOwnProperty(item)) delete collection[item]
      })

  let {
    operateRules: { scope, unrepeat },
  } = collection
  if (scope.unrepeat) {
    if (
      !unrepeat.database.label ||
      !unrepeat.collection.label ||
      !unrepeat.primaryKeys.length
    ) {
      return ElMessage.error('请选择去重时的比对库或表或列')
    }
    unrepeat.database.label && delete unrepeat.database.label
    unrepeat.collection.label && delete unrepeat.collection.label
  }
  /**
   * 指定了扩展属性
   * 因为JsonDocEditor不会修改传入的数据，返回的是副本，所以需要进行赋值
   */
  if (props.clSchema._id) {
    let extraInfo: any = elJdeDoc.value?.editing()
    let extraInfo2 = (new DocAsArray(extraInfo)).build(props.clSchema.body)
    if (extraInfo2) {
      Object.assign(collection, extraInfo2)
    }
  }

  if (mode === 'create')
    apiCollection
      .create(bucketName, dbName, collection)
      .then((newCollection: any) => {
        emit('submit', newCollection)
        closeDialog(newCollection)
      })
  else if (mode === 'update') {
    // 解决添加的children字段的问题
    let newCl = JSON.parse(JSON.stringify(toRaw(collection)))
    delete newCl.children
    apiCollection
      .update(bucketName, dbName, clBeforeName, newCl)
      .then((newCollection: any) => {
        emit('submit', newCollection)
        closeDialog(newCollection)
      })
  }
}
</script>
