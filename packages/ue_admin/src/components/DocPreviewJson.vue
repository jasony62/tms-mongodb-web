<template>
  <el-drawer v-model="opened" size="50%" :with-header="false" :show-close="false" :close-on-click-modal="true"
    :destroy-on-close="true">
    <div class="h-full w-full flex flex-col">
      <el-form class="flex-none">
        <el-form-item>
          <el-button @click="onClose">关闭</el-button>
          <el-button @click="onSave" v-if="SupportSave">保存修改</el-button>
        </el-form-item>
      </el-form>
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

const onClose = () => {
  opened.value = false
  jsonEditor = null
}

const onSave = () => {
  if (jsonEditor && typeof cbSave.value === 'function') {
    let newDoc = jsonEditor.get()
    cbSave.value(newDoc)
  }
}
</script>
