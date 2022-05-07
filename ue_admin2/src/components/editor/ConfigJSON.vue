<template>
  <el-dialog title="JSON" v-model="dialogVisible" :fullscreen="true" :destroy-on-close="true"
    :close-on-click-modal="false" :before-close="onBeforeClose">
    <div id="jsonEditor"></div>
    <template #footer>
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="onBeforeClose">取消</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import JSONEditor from 'jsoneditor'
import 'jsoneditor/dist/jsoneditor.css'
import { nextTick, onMounted, reactive, ref } from 'vue'

let editor: any = null

const emit = defineEmits(['submit'])

const props = defineProps({
  dialogVisible: { type: Boolean, default: true },
  jsonData: { type: Object, default: () => { } },
  onClose: { type: Function, default: (newData: any) => { } },
})
const options = reactive({
  mode: 'code',
  search: false,
  transform: false,
})

const onSubmit = () => {
  let newJsonData = editor.get()
  emit('submit', newJsonData)
  closeDialog(newJsonData)
}

// 关闭对话框时执行指定的回调方法
const closeDialog = (newCl?: any) => {
  props.onClose(newCl)
}

// 对话框关闭前触发
const onBeforeClose = () => {
  closeDialog(null)
}

onMounted(() => {
  nextTick(() => {
    const container = document.getElementById('jsonEditor')
    editor = new JSONEditor(container, options)
    editor.set(props.jsonData)
  })
})
</script>

<style lang="scss">
#configJsonEditor {

  .jsoneditor {

    .jsoneditor-transform,
    .jsoneditor-repair,
    .jsoneditor-poweredBy {
      display: none;
    }
  }

  .el-dialog.is-fullscreen {
    @apply flex flex-col;

    .el-dialog__body {
      @apply flex-grow
    }
  }

  #jsonEditor {
    height: 100%;
  }
}
</style>
