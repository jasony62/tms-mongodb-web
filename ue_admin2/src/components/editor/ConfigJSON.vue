<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal"
    v-if="dialogVisible">
    <div id="jsonEditor" style="height:100%"></div>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </div>
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
})

const destroyOnClose = ref(true)
const closeOnClickModal = ref(false)

const options = reactive({
  mode: 'code',
  search: false,
  transform: false,
})

onMounted(() => {
  nextTick(() => {
    const container = document.getElementById('jsonEditor')
    editor = new JSONEditor(container, options)
    editor.set(props.jsonData)
  })
})

const onSubmit = () => {
  let newJsonData = editor.get()
  emit('submit', newJsonData)
}
    // open(data) {
    //   this.jsonData = JSON.parse(JSON.stringify(data))
    //   this.$mount()
    //   document.body.appendChild(this.$el)
    //   return new Promise((resolve) => {
    //     this.$on('submit', (newValue) => {
    //       this.dialogVisible = false
    //       resolve(newValue)
    //     })
    //   })
    // }
  }
</script>

<style>
.jsoneditor .jsoneditor-transform,
.jsoneditor .jsoneditor-repair,
.jsoneditor .jsoneditor-poweredBy {
  display: none;
}
</style>
