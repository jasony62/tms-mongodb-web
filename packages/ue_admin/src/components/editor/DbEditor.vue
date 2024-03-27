<template>
  <el-dialog title="数据库" v-model="dialogVisible" :destroy-on-close="true" :close-on-click-modal="false"
    :before-close="onBeforeClose">
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="基本信息" name="info"></el-tab-pane>
      <el-tab-pane label="设置" name="setting"></el-tab-pane>
      <el-tab-pane label="访问控制列表" name="acl" v-if="database._id && database.aclCheck"></el-tab-pane>
    </el-tabs>
    <el-form :model="database" label-position="top" v-show="activeTab === 'info'">
      <el-form-item label="数据库名称（系统）">
        <el-input v-model="database.sysname" :disabled="mode === 'update'"></el-input>
      </el-form-item>
      <el-form-item label="数据库名称（英文）">
        <el-input v-model="database.name"></el-input>
      </el-form-item>
      <el-form-item label="数据库显示名（中文）">
        <el-input v-model="database.title"></el-input>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="database.description"></el-input>
      </el-form-item>
      <el-form-item label="自由表格">
        <el-select v-model="database.spreadsheet" placeholder="请选择">
          <el-option label="否" value="no"></el-option>
          <el-option label="是" value="yes"></el-option>
        </el-select>
      </el-form-item>
    </el-form>
    <el-form :model="database" label-position="top" v-show="activeTab === 'setting'">
      <el-form-item label="集合扩展属性定义" prop="cl_schema_id">
        <el-select v-model="database.cl_schema_id" clearable placeholder="请选择定义名称">
          <el-option v-for="schema in schemas" :key="schema._id" :label="schema.title" :value="schema._id" />
        </el-select>
        <el-alert title="通过指定【集合扩展属性定义】，给数据库下的集合添加属性字段，记录扩展业务信息。" type="info" :closable="false" />
      </el-form-item>
      <el-form-item label="使用访问控制列表">
        <el-switch v-model="database.aclCheck"></el-switch>
        <el-alert title="数据库创建成功后可设置访问控制列表。" type="info" :closable="false" v-if="!database._id" />
      </el-form-item>
      <el-form-item label="仅系统管理员可见">
        <el-switch v-model="database.adminOnly"></el-switch>
      </el-form-item>
    </el-form>
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

    <template #footer v-if="activeTab !== 'acl'">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onBeforeClose">取消</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, h } from 'vue'
import { ElMessageBox, ElButton, ElInput, ElSelect, ElOption } from 'element-plus'
import apiDb from '@/apis/database'
import apiSchema from '@/apis/schema'
import apiAcl from '@/apis/acl'
import { DEFAULT_VALUES } from '@/global'

const emit = defineEmits(['submit'])

const props = defineProps({
  mode: { type: String, default: '' },
  dialogVisible: { default: true },
  bucketName: { type: String },
  database: {
    type: Object,
    default: () => {
      return { name: '', title: '', description: '', aclCheck: DEFAULT_VALUES()?.aclCheck?.db, adminOnly: false, spreadsheet: 'no' }
    }
  },
  onClose: { type: Function, default: (newDb: any) => { } }
})

const { mode, bucketName, onClose } = props

const dialogVisible = ref(props.dialogVisible)
const database = reactive(props.database)
const activeTab = ref('info')
const schemas = reactive([] as any[])
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
  }, { default: () => [h(ElOption, { value: 'read', label: '数据库只读' }), h(ElOption, { value: 'readCl', label: '集合只读' })] })
}, {
  key: 'operaations',
  title: '操作',
  cellRenderer: ({ rowData, rowIndex }: { rowData: any, rowIndex: number }) => h('div', {}, { default: () => [h(ElButton, { onClick: () => removeAclUser(rowData, rowIndex) }, { default: () => '删除' }), h(ElButton, { disabled: !rowData.__modified, onClick: () => updateAclUser(rowData, rowIndex) }, { default: () => '保存修改' })] })
}]
const aclUserList = ref([] as any[])

// 关闭对话框时执行指定的回调方法
const closeDialog = (newDb?: any) => {
  onClose(newDb)
}

// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog(null)
}

const onSubmit = () => {
  const reg = /^[a-zA-z]/
  if (!reg.test(database.name)) {
    return ElMessageBox.alert('请输入以英文字母开头的库名')
  }
  if (mode === 'update') {
    apiDb
      .update(bucketName, database)
      .then((newDb: any) => {
        emit('submit', newDb)
        closeDialog(newDb)
      })
  } else if (mode === 'create') {
    apiDb
      .create(bucketName, database)
      .then((newDb: any) => {
        emit('submit', newDb)
        closeDialog(newDb)
      })
  }
}
const onAddAclUser = (newUser: any) => {
  const { id, remark } = newUser
  const target = { type: 'database', id: database._id }
  const user = { id, remark }
  apiAcl.add(target, user).then(() => {
    aclUserList.value.splice(0, 0, { user: { id, remark } })
    newAclUser.id = ''
    newAclUser.remark = ''
  })
}
const removeAclUser = (aclUser: any, index: number) => {
  const { user } = aclUser
  const target = { type: 'database', id: database._id }
  apiAcl.remove(target, { id: user.id }).then(() => {
    aclUserList.value.splice(index, 1)
  })
}
const updateAclUser = (aclUser: any, index: number) => {
  const { user, right } = aclUser
  const target = { type: 'database', id: database._id }
  apiAcl.update(target, { id: user.id, remark: user.remark }, { right }).then(() => {
    aclUser.__modified = false
  })
}
onMounted(() => {
  apiSchema
    .listSimple(bucketName, 'collection')
    .then((schemas2: any[]) => {
      schemas2.forEach((s: any) => {
        schemas.push(s)
      })
    })
  if (mode === 'update' && database.aclCheck === true) {
    apiAcl.list({ type: 'database', id: database._id }).then((result: any[]) => {
      result.forEach(acl => acl.__modified = false)
      aclUserList.value = result
    })
  }
})
</script>
