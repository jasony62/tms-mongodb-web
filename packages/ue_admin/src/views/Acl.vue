<template>
  <div class="flex flex-col gap-2">
    <div class="h-12 py-4 px-2">
      <el-breadcrumb :separator-icon="ArrowRight">
        <el-breadcrumb-item :to="{ name: 'databases' }">{{ DbLabel }}</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'database', params: { dbName: dbName } }">{{ dbName }}</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'collection', params: { clName: clName } }" v-if="clName">{{ clName
          }}</el-breadcrumb-item>
        <el-breadcrumb-item v-if="docId">{{ docId }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <el-form :inline="true" :model="newAclUser" label-position="left" class="px-2">
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
    <div style="height: 300px">
      <el-auto-resizer>
        <template #default="{ height, width }">
          <el-table-v2 :data="aclUserList" :columns="aclUserColumns" :width="width" :height="height" />
        </template>
      </el-auto-resizer>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ElButton, ElInput, ElSelect, ElOption, ElMessageBox } from 'element-plus'
import { ArrowRight } from '@element-plus/icons-vue'
import { computed, h, onMounted, reactive, ref } from 'vue'
import apiDb from '@/apis/database'
import apiCl from '@/apis/collection'
import apiAcl from '@/apis/acl'
import { LABEL } from '@/global'

const DbLabel = computed(() => LABEL('database', '数据库'))

const props = defineProps({
  bucketName: String,
  dbName: { type: String, default: '' },
  clName: { type: String, default: '' },
  docId: { type: String, default: '' },
})
const { bucketName, dbName, clName, docId } = props
const TargetType = docId ? 'document' : clName ? 'collection' : 'database'
const TargetRights = docId ? [{ value: 'readDoc', label: '文档只读' }] : clName ? [{ value: 'readCl', label: '集合只读' }, { value: 'readDoc', label: '文档只读' }] : [{ value: 'read', label: '数据库只读' }, { value: 'readCl', label: '集合只读' }]

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
  }, { default: () => TargetRights.map(right => h(ElOption, right)) })
}, {
  key: 'operations',
  title: '操作',
  cellRenderer: ({ rowData, rowIndex }: { rowData: any, rowIndex: number }) => h('div', {}, { default: () => [h(ElButton, { onClick: () => removeAclUser(rowData, rowIndex) }, { default: () => '删除' }), h(ElButton, { type: rowData.__modified ? 'primary' : '', disabled: !rowData.__modified, onClick: () => updateAclUser(rowData, rowIndex) }, { default: () => '保存修改' })] })
}]
const aclUserList = ref([] as any[])

const onAddAclUser = (newUser: any) => {
  const { id, remark } = newUser
  const user = { id, remark }
  apiAcl.add(AclTarget, user).then((data: any) => {
    aclUserList.value.splice(0, 0, { user: { id, remark } })
    newAclUser.id = ''
    newAclUser.remark = ''
  })
}

const removeAclUser = (aclUser: any, index: number) => {
  const { user } = aclUser
  apiAcl.remove(AclTarget, { id: user.id }).then(() => {
    aclUserList.value.splice(index, 1)
  })
}

const updateAclUser = (aclUser: any, index: number) => {
  const { user, right } = aclUser
  apiAcl.update(AclTarget, { id: user.id, remark: user.remark }, { right }).then(() => {
    aclUser.__modified = false
  })
}

const AclTarget = { type: TargetType, id: '' }

onMounted(() => {
  (new Promise(async (resolve: (id: string) => void, reject) => {
    if (TargetType === 'database') {
      const db = await apiDb.byName(props.bucketName, props.dbName)
      resolve(db._id)
    } else if (TargetType === 'collection') {
      const cl = await apiCl.byName(bucketName, dbName, clName)
      resolve(cl._id)
    } else if (docId) {
      resolve(docId)
    } else {
      reject('没有指定有效的参数')
    }
  })).then((id: string) => {
    AclTarget.id = id
    apiAcl.list(AclTarget).then((result: any) => {
      aclUserList.value = result
    })
  }).catch((msg: string) => {
    ElMessageBox.alert(msg)
  })
})
</script>
