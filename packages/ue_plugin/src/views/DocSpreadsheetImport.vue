<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <div>
      <el-form :inline="true">
        <el-form-item>
          <el-button @click="onCancel" v-if="!executed">取消</el-button>
          <el-button @click="onClose" v-if="executed">关闭</el-button>
        </el-form-item>
        <el-form-item>
          <el-radio-group v-model="operation" class="ml-4">
            <el-radio label="excel">上传Excel</el-radio>
            <el-radio label="json" v-if="false">上传JSON</el-radio>
            <el-radio label="template">下载模版</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </div>
    <div v-if="operation === 'excel' || operation === 'json'" class="flex flex-col gap-2">
      <el-form-item>
        <el-upload ref="upload" :action="''" :http-request="handleUpload" :file-list="fileList" :auto-upload="true"
          :limit="1" :on-change="handleChange" style="width:360px;">
          <el-button slot="trigger" type="primary">选取文件</el-button>
        </el-upload>
      </el-form-item>
      <el-form :inline="true" v-if="isUploadExcel">
        <el-form-item label="选择页">
          <el-select v-model="selectedSheetName" placeholder="选择" @change="onChangeSheet" style="width:180px;">
            <el-option v-for="name in sheetNames" :key="name" :label="name" :value="name" />
          </el-select>
        </el-form-item>
        <el-form-item :label="`共${rowTotal}行`" />
      </el-form>
      <div v-if="rowTotal">
        <el-form :inline="true">
          <el-form-item label="数据起始行">
            <el-input-number v-model="dataStartRow" :step="1" :min="1" step-strictly />
          </el-form-item>
          <el-form-item label="数据结束行">
            <el-input-number v-model="dataEndRow" :step="1" :min="0" step-strictly />
          </el-form-item>
        </el-form>
        <el-alert title="数据结束行指定为0时，读取数据到结尾" type="info" :closable="false" />
      </div>
      <el-form :inline="true" v-if="rowTotal">
        <el-form-item label="重建表格">
          <el-switch v-model="writeOptions.rebuild"></el-switch>
        </el-form-item>
        <el-form-item label="覆盖数据" v-if="writeOptions.rebuild === false">
          <el-switch v-model="writeOptions.overwrite"></el-switch>
        </el-form-item>
      </el-form>
      <div v-if="rowTotal">
        <el-form-item label="写入位置" v-if="writeOptions.rebuild === false">
          <el-input-number v-model="writeOptions.startIndex" :step="1" :min="minStartIndex" step-strictly />
        </el-form-item>
        <el-alert title="插入写入时，写入位置指定为0，从结尾开始写入" type="info" :closable="false" />
      </div>
      <el-form-item>
        <el-button type="primary" @click="onExecute('upload')" :disabled="!canSubmit">执行</el-button>
      </el-form-item>
    </div>
    <div v-if="operation === 'template'">
      <el-form label-width="120px">
        <el-form-item label="叶子节点数">
          <div>
            <el-input-number v-model="leafLevel" :step="1" :min="0" step-strictly @change="setLevel" />
            <div class="el-upload__tip">* 0代表导出所有节点</div>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button slot="trigger" type="primary" @click="onExecute('download')">执行</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="response-content flex-grow border border-gray-200 rounded-md overflow-auto" v-if="responseContent">
      <pre>{{ responseContent }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, toRaw, watch } from 'vue'
import * as XLSX from 'xlsx'
import { ElMessage } from 'element-plus'

const operation = ref('excel') // 要执行的操作
const executed = ref(false)
const responseContent = ref<string>('')
const fileList = ref([])
const upload = ref<any>(null)
const noUploadFile = ref(true)
const isUploadExcel = ref(false)
const rowTotal = ref(0) // 表格页中的数据条数
const leafLevel = ref<number>(0)

// 选择导入的excel文件中的sheet
let onChangeSheet: () => void

enum PluginWidgetAction {
  Created = 'Created',
  Cancel = 'Cancel',
  Execute = 'Execute',
  Close = 'Close',
}

interface PluginWidgetResult {
  action: PluginWidgetAction
  result?: any
  handleResponse?: boolean
  applyAccessTokenField?: string // 定用户输入中申请添加access_token的字段
  reloadOnClose?: boolean // 关闭部件后是否要刷新数据
}
// excel文件sheet页名称
const sheetNames = ref([] as string[])
const selectedSheetName = ref('')
// 数据起始行号
const dataStartRow = ref(3)
const dataEndRow = ref(0)
// 数据写入位置的最小值，覆盖写入时为1，插入写入时为0
const minStartIndex = computed(() => (writeOptions.overwrite ? 1 : 0))
/**
 * 数据写入设置
 */
const writeOptions = reactive({
  rebuild: false, // 重建自由表格
  overwrite: false, // 覆盖已有数据，否则插入
  startIndex: 0, // 数据写入位置
})
// 保证插入时，写入起始位置的最小值为1
watch(
  () => writeOptions.overwrite,
  (newVal) => {
    if (newVal === true && writeOptions.startIndex <= 1) {
      writeOptions.startIndex = 1
    }
  }
)
/**
 * 检查是否满足提交条件
 */
const canSubmit = computed(() => {
  if (noUploadFile.value === false) {
    if (isUploadExcel.value === true) {
      if (selectedSheetName.value) {
        return true
      }
    } else {
      return true
    }
  }
  return false
})

// 调用插件的页面
const Caller = window.parent
const message: PluginWidgetResult = { action: PluginWidgetAction.Created }
Caller.postMessage(message, '*')

/**接收结果*/
window.addEventListener('message', (event) => {
  const { data } = event
  const { response } = data
  if (response) {
    noUploadFile.value = false
    if (typeof response === 'string') {
      responseContent.value = response
    } else if (typeof response === 'object') {
      if (response.filePath) {
        window.open(response.filePath)
      } else {
        responseContent.value = JSON.stringify(response, null, 2)
      }
    }
  }
})

function handleChange(file: any, files: any) {
  if (files.length) noUploadFile.value = false
}

function setLevel(value: number) {
  if (Number.isNaN(value)) ElMessage.error('不支持的数据格式')
}

let doSubmit: any = null

function handleUpload(req: any) {
  const reader = new FileReader()

  //将文件以二进制形式读入页面
  const fileType = req.file.type
  if (fileType === 'application/json') {
    reader.readAsText(req.file)
  } else if (
    fileType ===
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    reader.readAsArrayBuffer(req.file)
  } else {
    ElMessage.error('不支持的文件格式')
    return
  }

  reader.onload = function (event: any) {
    const fileData = event.target.result
    /**
     * 获取文件信息
     */
    const { contentType, rowsJson, wb } = (() => {
      let contentType = ''
      let rowsJson, wb
      if (fileType === 'application/json') {
        rowsJson = JSON.parse(fileData)
        contentType = 'json'
        isUploadExcel.value = false
      } else {
        wb = XLSX.read(fileData, { type: 'binary' })
        isUploadExcel.value = true
        const wb2 = wb
        onChangeSheet = () => {
          const sh = wb2.Sheets[selectedSheetName.value]
          const rowsRaw = XLSX.utils.sheet_to_json(sh, { header: 1 })
          rowTotal.value = rowsRaw.length
        }
        sheetNames.value.push(...wb.SheetNames)
        if (sheetNames.value.length === 1) {
          selectedSheetName.value = sheetNames.value[0]
          onChangeSheet()
        }
        contentType = 'aoa'
      }
      return { contentType, rowsJson, wb }
    })()
    /**
     * 等待执行的提交操纵
     */
    doSubmit = () => {
      if (!Caller) return
      let rowsRaw // 要提交的内容
      if (contentType === 'aoa' && wb) {
        const sh = wb.Sheets[selectedSheetName.value]
        // header=1时返回的是包含所有行的aoa
        rowsRaw = XLSX.utils.sheet_to_json(sh, { header: 1 })
        if (Array.isArray(rowsRaw) && rowsRaw.length) {
          const startIndex = dataStartRow.value - 1
          const endIndex = dataEndRow.value > 0 ? dataEndRow.value : rowsRaw.length
          rowsRaw = rowsRaw.slice(startIndex, endIndex)
        }
      } else if (contentType === 'json' && rowsJson) {
        rowsRaw = rowsJson
      }
      if (contentType && rowsRaw && typeof rowsRaw === 'object') {
        const message: PluginWidgetResult = {
          action: PluginWidgetAction.Execute,
          result: {
            content: JSON.stringify(rowsRaw),
            contentType,
            writeOptions: toRaw(writeOptions),
          },
          applyAccessTokenField: 'url',
        }
        try {
          // 给调用方发送数据
          Caller.postMessage(message, '*')
          executed.value = true
        } catch (e) {
          console.log('未知错误', e)
        }
      }
    }
  }
}

function onExecute(action: string) {
  if (!Caller) return
  if (action === 'upload') {
    if (doSubmit) doSubmit()
  } else if (action === 'download') {
    const message: PluginWidgetResult = {
      action: PluginWidgetAction.Execute,
      result: { action: 'download', leafLevel: leafLevel.value },
      handleResponse: true,
    }
    try {
      // 给调用方发送数据
      Caller.postMessage(message, '*')
      executed.value = true
    } catch (e) {
      console.log('未知错误', e)
    }
  } else {
    console.log('不识别的操作指令')
  }
}

function onCancel() {
  if (Caller) {
    const message: PluginWidgetResult = { action: PluginWidgetAction.Cancel }
    Caller.postMessage(message, '*')
  }
}

function onClose() {
  if (Caller) {
    const message: PluginWidgetResult = {
      action: PluginWidgetAction.Close,
      reloadOnClose: true,
    }
    Caller.postMessage(message, '*')
  }
}
</script>
