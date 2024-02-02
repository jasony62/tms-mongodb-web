<template>
  <el-dialog title="数据库" v-model="dialogVisible" :destroy-on-close="true" :close-on-click-modal="false"
    :before-close="onBeforeClose">
    <el-form ref="form" :model="database" label-position="top">
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
      <el-form-item label="集合扩展属性定义" prop="cl_schema_id">
        <el-select v-model="database.cl_schema_id" clearable placeholder="请选择定义名称">
          <el-option v-for="schema in schemas" :key="schema._id" :label="schema.title" :value="schema._id" />
        </el-select>
        <el-alert title="通过指定【集合扩展属性定义】，给数据库下的集合添加属性字段，记录扩展业务信息。" type="info" :closable="false" />
      </el-form-item>
      <el-form-item label="仅系统管理员可见">
        <el-switch v-model="database.adminOnly"></el-switch>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onBeforeClose">取消</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessageBox } from 'element-plus'
import apiDb from '@/apis/database'
import apiSchema from '@/apis/schema'

const emit = defineEmits(['submit'])

const props = defineProps({
  mode: { type: String, default: '' },
  dialogVisible: { default: true },
  bucketName: { type: String },
  database: {
    type: Object,
    default: () => {
      return { name: '', title: '', description: '', adminOnly: false }
    }
  },
  onClose: { type: Function, default: (newDb: any) => { } }
})

const { mode, bucketName, onClose } = props

const dialogVisible = ref(props.dialogVisible)
const database = reactive(props.database)

const schemas = reactive([] as any[])

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
onMounted(() => {
  apiSchema
    .listSimple(bucketName, 'collection')
    .then((schemas2: any[]) => {
      schemas2.forEach((s: any) => {
        schemas.push(s)
      })
    })
})
</script>
