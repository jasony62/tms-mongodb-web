<template>
  <div id="schemaEditor">
    <!--header-->
    <div class="h-12 py-4 px-2">
      <el-breadcrumb :separator-icon="ArrowRight">
        <el-breadcrumb-item :to="{ name: 'home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ title }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="p-2 border border-gray-200 mb-2 rounded-md text-center">
      <el-button type="primary" @click="onSubmit">{{ submitTitle }}</el-button>
    </div>
    <div class="h-full flex flex-row">
      <el-tabs tab-position="left" v-model="activeTab">
        <el-tab-pane label="基本信息" name="first"></el-tab-pane>
        <el-tab-pane label="列定义" name="second"></el-tab-pane>
      </el-tabs>
      <div class="overflow-auto flex-grow">
        <el-form v-show="activeTab === 'first'" :model="schema" label-position="top">
          <el-form-item label="显示名（中文）">
            <el-input v-model="schema.title"></el-input>
          </el-form-item>
          <el-form-item label="说明">
            <el-input type="textarea" v-model="schema.description"></el-input>
          </el-form-item>
          <el-form-item label="标签">
            <el-select v-model="schema.tags" multiple clearable placeholder="请选择">
              <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
            </el-select>
          </el-form-item>
        </el-form>
        <div v-if="activeTab === 'second'" class="flex flex-row gap-4 h-full overflow-auto">
          <tms-json-schema ref="$jse" :schema="schema.body" :root-name="'$'" :on-upload="onUploadFile"
            class="h-full overflow-auto" :on-message="onMessage">
            <template #extattrs="{ attrs }">
              <el-form-item label="不可修改">
                <el-switch v-model="attrs.readonly"></el-switch>
              </el-form-item>
            </template>
          </tms-json-schema>
          <div class="h-full flex-grow flex flex-col gap-2 relative" style="max-width:50%;">
            <div class="absolute top-0 right-0">
              <el-button @click="preview">预览</el-button>
              <el-tooltip effect="dark" content="复制" placement="bottom" :visible="copyTooltipVisible">
                <el-button @click="copy" :disabled="!previewResult">复制</el-button>
              </el-tooltip>
            </div>
            <div class="border-2 border-gray-300 rounded-md p-2 h-full w-full overflow-auto">
              <pre>{{ previewResult }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import apiSchema from '@/apis/schema'
import apiTag from '@/apis/tag'
import apiDoc from '@/apis/document'
import { ArrowRight } from '@element-plus/icons-vue'
import { computed, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

import useClipboard from 'vue-clipboard3'
import { ElMessage } from 'element-plus'

const router = useRouter()

// JSONSchema编辑器
const $jse = ref(null as unknown as { editing: () => any })

const props = defineProps({
  bucketName: { type: String, default: '' },
  scope: { type: String, default: '' },
  schemaId: { type: String, default: '' },
})
const { bucketName, scope, schemaId } = props

const submitTitle = computed(() => {
  return schemaId ? '修改' : '新建'
})
const title = computed(() => {
  let t = scope === 'document' ? '文档内容定义' : (scope === 'db' ? '数据库属性定义' : '集合属性定义')
  t += '-' + (schemaId ? '修改' : '新建')
  return t
})
const activeTab = ref('first')
const tags = reactive([] as any[])

const schema = ref({ title: '', description: '', scope: scope, tags: [], body: {} })
const previewResult = ref('')

const onUploadFile = (file: any) => {
  let fileData = new FormData()
  fileData.append('file', file)
  const config = { 'Content-Type': 'multipart/form-data' }
  return apiDoc
    .upload({ bucket: bucketName }, fileData, config)
    .then((uploadUrl: any) => {
      return { name: file.name, url: uploadUrl }
    })
    .catch((error: any) => {
      throw error
    })
}

const preview = () => {
  previewResult.value = JSON.stringify($jse.value?.editing(), null, 2)
}

const { toClipboard } = useClipboard()

const copyTooltipVisible = ref(false)

const copy = async () => {
  try {
    await toClipboard(previewResult.value)
    copyTooltipVisible.value = true
    setTimeout(() => { copyTooltipVisible.value = false }, 1000)
  } catch (e) { }
}

const onMessage = (msg: string) => {
  alert(`报错了:${msg}`,)
}

const onSubmit = () => {
  let newBody = $jse.value?.editing()
  if (newBody)
    Object.assign(schema.value.body, newBody)
  if (schemaId) {
    apiSchema
      .update(bucketName, schemaId, schema.value)
      .then(() => {
        ElMessage.success({ message: '修改成功' })
        router.push({ name: 'home' })
      })
      .catch(() => {
        ElMessage.error({ message: '修改失败' })
      })
  } else {
    apiSchema
      .create(bucketName, schema.value)
      .then(() => {
        ElMessage.success({ message: '创建成功' })
        router.push({ name: 'home' })
      })
      .catch(() => {
        ElMessage.error({ message: '创建失败' })
      })
  }
}

apiTag.list(bucketName).then((datas: any) => {
  tags.push(...datas)
})

if (schemaId) {
  apiSchema.get(bucketName, schemaId).then((data: any) => {
    schema.value = data
  })
}
</script>


