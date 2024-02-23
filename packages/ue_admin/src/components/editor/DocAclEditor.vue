<template>
  <el-dialog title="数据库" v-model="dialogVisible" :destroy-on-close="true" :close-on-click-modal="false"
    :before-close="onBeforeClose">
    <div>
      <el-form :inline="true" :model="newAclUser" label-position="left">
        <el-form-item label="用户">
          <el-input v-model="newAclUser.id"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onAddAclUser(newAclUser)">添加</el-button>
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
    <template #footer>
      <el-button @click="onBeforeClose">关闭</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref, h } from 'vue'
import { ElButton } from 'element-plus'
import apiAcl from '@/apis/acl'

const emit = defineEmits(['submit'])

const props = defineProps({
  mode: { type: String, default: '' },
  dialogVisible: { default: true },
  bucketName: { type: String },
  doc: {
    type: Object,
    default: () => {
      return {}
    }
  },
  onClose: { type: Function, default: (newDb: any) => { } }
})

const { onClose } = props

const dialogVisible = ref(props.dialogVisible)
const doc = reactive(props.doc)
const newAclUser = reactive({} as any)
const aclUserColumns = [{
  key: 'id',
  dataKey: 'user.id',
  title: '用户',
  width: '200px'
}, {
  key: 'operaations',
  title: '操作',
  cellRenderer: ({ rowData, rowIndex }: { rowData: any, rowIndex: number }) => h(ElButton, { onClick: () => removeAclUser(rowData, rowIndex) }, { default: () => '删除' })
}]
const aclUserList = ref([] as any[])

// 关闭对话框时执行指定的回调方法
const closeDialog = () => {
  onClose()
}

// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog()
}

const onAddAclUser = (newUser: any) => {
  const { id } = newUser
  const target = { type: 'document', id: doc._id }
  const user = { id }
  apiAcl.add(target, user).then((data: any) => {
    aclUserList.value.splice(0, 0, { user: { id } })
    newAclUser.id = ''
  })
}
const removeAclUser = (aclUser: any, index: number) => {
  const { user } = aclUser
  const target = { type: 'document', id: doc._id }
  apiAcl.remove(target, { id: user.id }).then(() => {
    aclUserList.value.splice(index, 1)
  })
}
onMounted(() => {
  apiAcl.list({ type: 'document', id: doc._id }).then((result: any) => {
    aclUserList.value = result
  })
})
</script>
