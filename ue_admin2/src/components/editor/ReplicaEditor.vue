<template>
  <el-dialog title="复制关系" v-model="dialogVisible" :destroy-on-close="true" :close-on-click-modal="true"
    :before-close="onBeforeClose">
    <el-form ref="form" :model="replica" label-position="top">
      <el-form-item label="主集合数据库名称">
        <el-select v-model="replica.primary.db" placeholder="请选择主集合数据库"
          @change="getCollection('primary', replica.primary.db)">
          <el-option v-for="db in dbs" :key="db.name" :label="db.label" :value="db.name"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="主集合名称">
        <el-select v-model="replica.primary.cl" placeholder="请选择主集合名称">
          <el-option v-for="cl in primarycls" :key="cl.name" :label="cl.label" :value="cl.name"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="从集合数据库名称">
        <el-select v-model="replica.secondary.db" placeholder="请选择从集合数据库"
          @change="getCollection('secondary', replica.secondary.db)">
          <el-option v-for="db in dbs" :key="db.name" :label="db.label" :value="db.name"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="从集合名称">
        <el-select v-model="replica.secondary.cl" placeholder="请选择从集合名称">
          <el-option v-for="cl in secondcls" :key="cl.name" :label="cl.label" :value="cl.name"></el-option>
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onBeforeClose">取消</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import apiDb from '@/apis/database'
import apiCl from '@/apis/collection'
import apiReplica from '@/apis/replica'

import { onMounted, reactive, ref } from 'vue';

const emit = defineEmits(['submit'])

const props = defineProps({
  dialogVisible: { default: true },
  bucketName: { type: String },
  replica: {
    type: Object,
    default: () => {
      return { primary: { db: '', cl: '' }, secondary: { db: '', cl: '' } }
    }
  },
  onClose: { type: Function, default: (newReplica: any) => { } }
})

const dialogVisible = ref(props.dialogVisible)

const { bucketName, onClose } = props

const dbs = ref([] as any[])
const primarycls = ref([] as any[])
const secondcls = ref([] as any[])
const replica = reactive(props.replica)

onMounted(() => {
  apiDb.list(bucketName).then((dbs2: any[]) => {
    dbs2.forEach((db) => {
      dbs.value.push({ name: db.name, label: `${db.title} (${db.name})` })
    })
  })
})

// 关闭对话框时执行指定的回调方法
const closeDialog = (newDb?: any) => {
  onClose(newDb)
}

// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog(null)
}

const getCollection = (type: string, dbName: string) => {
  apiCl.list(bucketName, dbName).then((cls: any[]) => {
    if (type === 'primary') {
      primarycls.value = cls
        .filter((cl: { usage: number; }) => !cl.usage && cl.usage !== 1)
        .map((cl: { name: any; title: any; }) => {
          return { name: cl.name, label: `${cl.title} (${cl.name})` }
        })
    } else {
      secondcls.value = cls
        .filter((cl: { usage: number; }) => cl.usage && cl.usage === 1)
        .map((cl: { name: any; title: any; }) => {
          return { name: cl.name, label: `${cl.title} (${cl.name})` }
        })
    }
  })
}
const onSubmit = () => {
  apiReplica.create(bucketName, replica).then(() => {
    const { name: pdname, label: pdlabel } = dbs.value.find(
      (db: { name: any; }) => db.name === props.replica.primary.db
    )
    const { name: sdname, label: sdlabel } = dbs.value.find(
      (db: { name: any; }) => db.name === props.replica.secondary.db
    )
    const { name: pcname, label: pclabel } = primarycls.value.find(
      (primarycl: { name: any; }) => primarycl.name === props.replica.primary.cl
    )
    const { name: scname, label: sclabel } = secondcls.value.find(
      (secondcl: { name: any; }) => secondcl.name === props.replica.secondary.cl
    )
    let result = {
      primary: {
        db: { name: pdname, label: pdlabel },
        cl: { name: pcname, label: pclabel }
      },
      secondary: {
        db: { name: sdname, label: scname },
        cl: { name: sdlabel, label: sclabel }
      }
    }
    emit('submit', result)
  })
}
</script>
