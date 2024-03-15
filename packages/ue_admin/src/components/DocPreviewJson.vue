<template>
  <el-drawer v-model="opened" size="50%" :with-header="false" :show-close="false" :close-on-click-modal="true"
    :destroy-on-close="true">
    <div class="h-full w-full flex flex-col">
      <div class="flex-none flex flex-row gap-2">
        <div>
          <el-button @click="onClose">关闭</el-button>
        </div>
        <div>
          <el-button @click="onSave" v-if="SupportSave">保存修改</el-button>
        </div>
        <el-upload ref="uploadRef" v-if="SupportSave" :auto-upload="false" :show-file-list="false"
          :on-change="onImportFile">
          <template #trigger>
            <el-button>导入文件</el-button>
          </template>
        </el-upload>
      </div>
      <div class="flex-grow">
        <div ref="elJsonEditor" class="w-full h-full"></div>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped lang="scss">
:deep(.jsoneditor) {

  .jsoneditor-transform,
  .jsoneditor-poweredBy {
    display: none;
  }
}
</style>

<script setup lang="ts">
import JSONEditor from 'jsoneditor'
import 'jsoneditor/dist/jsoneditor.css'
import { useDocPreviewJson } from '@/composables/docPreviewJson'
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage, UploadFile } from 'element-plus'

const { opened, previewDoc, cbSave } = useDocPreviewJson()

const SupportSave = computed(() => typeof cbSave.value === 'function')

const elJsonEditor = ref<HTMLElement | null>(null)

const options = {
  mode: 'code',
  search: false,
}

let jsonEditor: any

watch(opened, (val) => {
  if (val) {
    nextTick(() => {
      if (!elJsonEditor.value) return
      //@ts-ignore
      jsonEditor ??= new JSONEditor(elJsonEditor.value, options)
      if (previewDoc.value) {
        let doc = JSON.parse(JSON.stringify(previewDoc.value))
        delete doc._id
        jsonEditor.set(doc)
      }
    })
  }
})
/**
 * 导入文件
 * @param uploadFile
 */
const onImportFile = (uploadFile: UploadFile) => {
  if (uploadFile?.raw) {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (reader.result) {
        try {
          let newDoc = JSON.parse(reader.result.toString())
          jsonEditor.set(newDoc)
        } catch (e: any) {
          ElMessage.success({ showClose: true, type: 'error', message: '导入失败，原因：' + e.message })
        }
      }
    })
    reader.readAsText(uploadFile.raw)
  }
}
/**
 * 关闭
 */
const onClose = () => {
  opened.value = false
  jsonEditor = null
}
/**
 * 保存
 */
const onSave = () => {
  if (jsonEditor && typeof cbSave.value === 'function') {
    let newDoc = jsonEditor.get()
    cbSave.value(newDoc)
  }
}
</script>
