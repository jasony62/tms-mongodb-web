<template>
  <el-dialog title="集合" v-model="dialogVisible" :destroy-on-close="true" :close-on-click-modal="false"
    :before-close="onBeforeClose">
    <div class="el-dialog-div">
      <el-tabs v-model="activeTab" type="card">
        <el-tab-pane label="基本信息" name="info"></el-tab-pane>
        <el-tab-pane label="扩展信息" name="extra"></el-tab-pane>
        <el-tab-pane label="设置" name="setting"></el-tab-pane>
        <el-tab-pane label="文档编辑转换规则" name="convert" v-if="false"></el-tab-pane>
        <el-tab-pane label="访问控制列表" name="acl" v-if="collection._id && collection.aclCheck"></el-tab-pane>
      </el-tabs>
      <el-form :model="collection" label-position="top" v-show="activeTab === 'info'" :rules="rules">
        <el-form-item label="所属分类目录" v-if="clDirs?.length">
          <el-tree-select v-model="newClDirFullName" clearable check-strictly :data="clDirs"
            :render-after-expand="false" node-key="full_name" :props="ClDirTreeProps" />
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
        <el-form-item label="集合文档字段定义" prop="schema_id">
          <el-select v-model="collection.schema_id" clearable placeholder="请选择定义名称">
            <el-option-group v-for="schema in schemas" :key="schema.label" :label="schema.label">
              <el-option v-for="item in schema.options" :key="item._id" :label="item.title" :value="item._id" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input type="textarea" v-model="collection.description"></el-input>
        </el-form-item>
        <el-form-item label="自由表格">
          <el-select v-model="collection.spreadsheet" placeholder="请选择">
            <el-option label="否" value="no"></el-option>
            <el-option label="是" value="yes"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div v-show="activeTab === 'extra'">
        <el-form :model="collection" label-position="top" :rules="rules">
          <el-form-item label="集合文档内容定义（扩展）">
            <div>
              <el-form :inline="true" label-position="left">
                <el-form-item>
                  <el-select v-model="newClExtSchema.id" clearable placeholder="请选择定义名称" style="width: 240px">
                    <el-option-group v-for="schema in schemas" :key="schema.label" :label="schema.label">
                      <el-option v-for="item in schema.options" :key="item._id" :label="item.title" :value="item._id" />
                    </el-option-group>
                  </el-select>
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="onAddClExtSchema()">添加</el-button>
                </el-form-item>
              </el-form>
              <div class="flex flex-col mt-2" v-if="collection.ext_schemas.length">
                <div v-for="(s, index) in collection.ext_schemas" class="flex flex-row gap-2">
                  <div>{{ s.title }}</div>
                  <div><el-button size="small" @click="onRemoveClExtSchema(s, index)" :icon="Delete" circle></el-button>
                  </div>
                </div>
              </div>
            </div>
            <el-alert title="在基础文档内容定义的基础上，合并多个文档定义，构成使用的定义。" type="info" :closable="false" />
          </el-form-item>
          <el-form-item label="集合标签" v-if="false">
            <el-select v-model="collection.tags" clearable multiple placeholder="请选择集合标签">
              <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
            </el-select>
          </el-form-item>
        </el-form>
      </div>
      <el-form label-position="top" v-show="activeTab === 'setting'">
        <el-form-item label="集合通过访问控制列表访问">
          <el-switch v-model="collection.aclCheck"></el-switch>
          <el-alert title="集合创建成功后可设置访问控制列表。" type="info" :closable="false" v-if="!collection._id" />
        </el-form-item>
        <el-form-item label="集合中的文档通过访问控制列表访问">
          <el-switch v-model="collection.docAclCheck"></el-switch>
        </el-form-item>
        <el-form-item label="集合仅系统管理员可见">
          <el-switch v-model="collection.adminOnly"></el-switch>
        </el-form-item>
        <el-form-item label="集合中的文档保存到Elasticsearch">
          <el-switch v-model="collection.extensions.elasticsearch.enabled"></el-switch>
        </el-form-item>
        <el-form-item label="按文档创建先后升序排序（默认降序）">
          <el-switch v-model="collection.orderBy._id" active-value="asc" inactive-value="desc"></el-switch>
        </el-form-item>
      </el-form>
      <div v-show="activeTab === 'convert'" class="h-96">
        <textarea ref="elConvEditor" class="h-full w-full border border-gray-200 p-2"
          v-model="docFieldConvertRules"></textarea>
      </div>
      <div v-show="activeTab === 'acl'">
        <el-form :inline="true" :model="newAclUser" label-position="left">
          <el-form-item label="用户">
            <el-input v-model="newAclUser.id"></el-input>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="newAclUser.remark"></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :disabled="!newAclUser.id" @click="onAddAclUser(newAclUser)">添加</el-button>
          </el-form-item>
        </el-form>
        <div style="height:300px">
          <el-auto-resizer>
            <template #default="{ height, width }">
              <el-table-v2 :data="aclUserList" :columns="aclUserColumns" :width="width" :height="height" />
            </template>
          </el-auto-resizer>
        </div>
      </div>
    </div>

    <template #footer v-if="activeTab !== 'acl'">
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
import apiAcl from '@/apis/acl'
import { computed, h, onMounted, reactive, ref, toRaw, watch } from 'vue'
import { FormRules, ElMessageBox, ElButton, ElInput, ElSelect, ElOption } from 'element-plus'

import 'tms-vue3-ui/dist/es/json-doc/style/tailwind.scss'
import { Delete } from '@element-plus/icons-vue'
import { DEFAULT_VALUES } from '@/global'
import facStore from '@/store'

const store = facStore()

// 查找条件下拉框分页包含记录数
const SELECT_PAGE_SIZE = 7

const emit = defineEmits(['submit'])

const props = defineProps({
  mode: { default: '' },
  dialogVisible: { default: true },
  bucketName: { type: String, default: '' },
  dbName: { type: String, default: '' },
  clDir: { type: Object, default: { full_name: '', full_title: '' } },
  collection: {
    type: Object,
    default: () => {
      return {
        name: '',
        title: '',
        description: '',
        schema_id: '',
        ext_schemas: [],
        tags: [],
        dir_full_name: '',
        spreadsheet: 'no',
        aclCheck: DEFAULT_VALUES()?.aclCheck?.cl,
        docAclCheck: DEFAULT_VALUES()?.aclCheck?.doc,
        adminOnly: false,
        extensions: {
          elasticsearch: {
            enabled: false
          },
        },
        orderBy: {
          TMW_CREATE_TIME: 'desc'
        },
        docFieldConvertRules: {},
      }
    },
  },
  onClose: { type: Function, default: (newCl: any) => { } },
})

// 设置默认值
props.collection.ext_schemas ??= []
props.collection.extensions ??= { elasticsearch: { enabled: false } }
props.collection.extensions.elasticsearch ??= { enabled: false }
props.collection.orderBy ??= {}

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

const { mode, bucketName, dbName, onClose } = props
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
// 集合所属分类目录
const newClDirFullName = ref(collection.dir_full_name)
const clDirs = ref<any>(null)
const ClDirTreeProps = {
  children: 'children',
  label: 'title',
}
const listClDir = (async () => {
  clDirs.value = await store.listCollectionDir({
    bucket: bucketName,
    db: dbName,
  })
})
/**
 * 扩展schema
 */
const newClExtSchema = ref({ id: '' })
/**
 * 访问控制列表
 */
const newAclUser = reactive({} as any)
const aclUserColumns = [{
  key: 'id',
  dataKey: 'user.id',
  title: '用户',
  width: '200px'
}, {
  key: 'remark',
  dataKey: 'user.remark',
  title: '备注',
  width: '200px',
  cellRenderer: ({ rowData }: { rowData: any }) => h(ElInput, {
    modelValue: rowData.user.remark, onInput: (value) => {
      rowData.user.remark = value
      rowData.__modified = true
    }
  })
}, {
  key: 'right',
  title: '权限控制',
  width: '200px',
  cellRenderer: ({ rowData }: { rowData: any }) => h(ElSelect, {
    modelValue: rowData.right, multiple: true, clearable: true, onChange: (value) => {
      rowData.right = value
      rowData.__modified = true
    }
  }, { default: () => [h(ElOption, { value: 'readCl', label: '集合只读' }), h(ElOption, { value: 'readDoc', label: '文档只读' })] })
}, {
  key: 'operations',
  title: '操作',
  cellRenderer: ({ rowData, rowIndex }: { rowData: any, rowIndex: number }) => h('div', {}, { default: () => [h(ElButton, { onClick: () => removeAclUser(rowData, rowIndex) }, { default: () => '删除' }), h(ElButton, { type: rowData.__modified ? 'primary' : '', disabled: !rowData.__modified, onClick: () => updateAclUser(rowData, rowIndex) }, { default: () => '保存修改' })] })
}]
const aclUserList = ref([] as any[])

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
  listClDir()
  apiTag.list(props.bucketName).then((tags2: any[]) => {
    tags2.forEach((t) => tags.value.push(t))
  })
  // 访问列表
  if (mode === 'update' && collection.aclCheck === true) {
    apiAcl.list({ type: 'collection', id: collection._id }).then((result: any[]) => {
      result.forEach(acl => acl.__modified = false)
      aclUserList.value = result
    })
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
  schema_id: [{ required: true, message: '集合文档定义不允许为空' }]
})

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

  // 所属分类目录
  collection.dir_full_name = toRaw(newClDirFullName.value)

  if (mode === 'create') {
    apiCollection
      .create(bucketName, dbName, collection)
      .then((newCollection: any) => {
        emit('submit', newCollection)
        closeDialog(newCollection)
      })
  } else if (mode === 'update') {
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
const onAddClExtSchema = (usage = 'edit') => {
  if (newClExtSchema.value.id) {
    const { id } = newClExtSchema.value
    let schema = schemas[0].options.find((s) => s._id === id)
    if (!schema) schema = schemas[1].options.find((s) => s._id === id)
    if (schema) {
      const clExtSchema = { id, title: schema.title, usage }
      collection.ext_schemas.push(clExtSchema)
    }
    newClExtSchema.value.id = ''
  }
}
const onRemoveClExtSchema = (clExtSchema: any, index: number) => {
  collection.ext_schemas.splice(index, 1)
}
const onAddAclUser = (newUser: any) => {
  const { id, remark } = newUser
  const target = { type: 'collection', id: collection._id }
  const user = { id, remark }
  apiAcl.add(target, user).then(() => {
    aclUserList.value.splice(0, 0, { user: { id, remark } })
    newAclUser.id = ''
  })
}
const removeAclUser = (aclUser: any, index: number) => {
  const { user } = aclUser
  const target = { type: 'collection', id: collection._id }
  apiAcl.remove(target, { id: user.id }).then(() => {
    aclUserList.value.splice(index, 1)
  })
}
const updateAclUser = (aclUser: any, index: number) => {
  const { user, right } = aclUser
  const target = { type: 'collection', id: collection._id }
  apiAcl.update(target, { id: user.id, remark: user.remark }, { right }).then(() => {
    aclUser.__modified = false
  })
}
</script>
