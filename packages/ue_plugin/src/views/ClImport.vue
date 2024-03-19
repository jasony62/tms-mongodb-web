<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <el-alert v-if='help' :title="help" type="info" effect="dark" show-icon />
    <el-form-item>
      <el-upload ref="upload" :action="''" :http-request="handleUpload" :file-list="fileList" :auto-upload="true"
        :limit="1" :on-change="handleChange">
        <el-button slot="trigger" type="primary">选取文件</el-button>
        <template #tip>
          <div class="el-upload__tip">
            需上传.xls、.xlsx类型的文件，且不超过10MB
          </div>
        </template>
      </el-upload>
    </el-form-item>
    <el-form :inline="true" v-if="isFileUploaded">
      <el-form-item label="选择页">
        <el-select v-model="selectedSheetName" placeholder="选择" @change="onChangeSheet" style="width:180px;">
          <el-option v-for="name in sheetNames" :key="name" :label="name" :value="name" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="selectedSheetName" :label="`共${rowTotal}行`" />
    </el-form>
    <el-form :inline="true" v-if="isFileUploaded && rowTotal">
      <el-form-item label="列标题（中文）行号">
        <el-input-number v-model="titleRow" :step="1" :min="0" step-strictly />
      </el-form-item>
      <el-form-item label="列名称（英文）行号">
        <el-input-number v-model="nameRow" :step="1" :min="0" step-strictly />
      </el-form-item>
    </el-form>
    <el-form :inline="true" v-if="isFileUploaded && rowTotal">
      <el-form-item label="数据起始行号">
        <el-input-number v-model="dataStartRow" :step="1" :min="1" step-strictly />
      </el-form-item>
      <el-form-item label="数据结束行号">
        <el-input-number v-model="dataEndRow" :step="1" :min="0" step-strictly />
      </el-form-item>
    </el-form>
    <el-form :inline="true" v-if="isFileUploaded && rowTotal">
      <el-form-item label="集合名称">
        <el-input v-model="clName"></el-input>
      </el-form-item>
      <el-form-item label="自由表格">
        <el-select v-model="clSpreadsheet" placeholder="请选择">
          <el-option label="否" value="no"></el-option>
          <el-option label="是" value="yes"></el-option>
        </el-select>
      </el-form-item>
    </el-form>
    <el-form label-position="top">
      <el-form-item>
        <el-button type="primary" @click="onExecute" :disabled="!canSubmit">执行</el-button>
        <el-button @click="onCancel" v-if="!executed">取消</el-button>
        <el-button @click="onClose" v-if="executed">关闭</el-button>
      </el-form-item>
    </el-form>
    <div class="response-content flex-grow border border-gray-200 rounded-md overflow-auto" v-if="responseContent">
      <pre>{{ responseContent }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRaw } from 'vue'
import * as XLSX from 'xlsx'
import { ElMessage, ElMessageBox } from 'element-plus'
import { pinyin } from 'pinyin-pro'

const pinYinHandler = (str: string): string => {
  let flag = 1;
  let pinYinRes: any[] = [];
  let pinYinArr = pinyin(str, { type: 'all', toneType: 'none', v: true });
  pinYinArr.forEach((x, i) => {
    if (x.isZh) {
      i !== 0 && pinYinRes.push('_')
      pinYinRes.push(x.pinyin)
      i !== pinYinArr.length - 1 && pinYinRes.push('_')
    } else {
      if (/[a-zA-Z]/.test(x.origin)) {
        pinYinRes.push(x.origin)
      } else if (/[\d\s\W]/.test(x.origin)) {
        pinYinRes.push('')
      } else {
        pinYinRes.push(`column_${flag}`)
        flag++
      }
    }
  })
  let pinyinResStr = pinYinRes.join('').replace(/__+/g, '_');
  return pinyinResStr.endsWith('_') ? pinyinResStr.slice(0, -1) : pinyinResStr;
}

const executed = ref(false)
const responseContent = ref<string>('')
const fileList = ref([])
const upload = ref<any>(null)
const noUpload = ref(true)
const uploadFilename = ref('')
const isFileUploaded = ref(false)
// excel文件sheet页名称
const sheetNames = ref([] as string[])
const selectedSheetName = ref('')
const rowTotal = ref(0)
const titleRow = ref(0) // 标题
const nameRow = ref(0) // 名称行
const dataStartRow = ref(3) // 数据起始行
const dataEndRow = ref(0) // 数据起始行
const dataRaw = ref<any[] | null>(null) // 表格页数据
const clName = ref('')
const clSpreadsheet = ref('no')
// 指定的集合所属目录
const assignedClDir = ref()
// 帮助
const help = ref('')

// 列标题
const colTitles = computed(() => {
  if (!Array.isArray(dataRaw.value) || dataRaw.value.length === 0) return []
  if (titleRow.value > 0 && titleRow.value < dataRaw.value.length) {
    return dataRaw.value[titleRow.value - 1]
  }
  return []
})
// 列名称
const colNames = computed(() => {
  if (!Array.isArray(dataRaw.value) || dataRaw.value.length === 0) return []
  // 指定了名称行
  if (nameRow.value > 0 && nameRow.value < dataRaw.value.length) {
    return dataRaw.value[nameRow.value - 1]
  } else if (colTitles.value.length) {
    return colTitles.value.map((x: string) => pinYinHandler(x))
  }
  return []
})


// 选择导入的excel文件中的sheet
let onChangeSheet: (() => void) | null

// 导入数据提交方法
const doSubmit = () => {
  if (!Array.isArray(dataRaw.value) || dataRaw.value.length === 0) return

  const names = toRaw(colNames.value)
  const rowsAoa = dataRaw.value
  const docs = []
  const lastRow = (dataEndRow.value <= 0 || dataEndRow.value > rowsAoa.length) ? rowsAoa.length : dataEndRow.value
  for (let i = dataStartRow.value - 1; i < lastRow; i++) {
    let doc = names?.reduce((doc: any, name: string, index: number) => {
      let val: any = rowsAoa[i][index]
      if (val instanceof Date) {
        // excel的时间差43秒
        val = (new Date(val.getTime() + 43000)).toLocaleString()
      }
      if (val) doc[name] = val
      return doc
    }, {})
    // 忽略空对象
    if (Object.keys(doc).length) docs.push(doc)
  }

  const titles = toRaw(colTitles.value)
  const filename = toRaw(uploadFilename.value)
  execUploadData(names, titles, docs, filename)
}
/**
 * 执行上传数据
 */
const execUploadData = (names: string[] | null, titles: string[] | null, docs: any[], fileName: string) => {
  if (Caller && typeof docs === 'object') {
    const message: PluginWidgetResult = {
      action: PluginWidgetAction.Execute,
      result: {
        data: JSON.stringify(docs),
        fileName,
        names,
        titles,
        clName: clName.value,
        dir_full_name: assignedClDir.value?.full_name,
        clSpreadsheet: clSpreadsheet.value,
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
/**
 * 是否符合提交条件
 */
const CL_NAME_RE = /^[a-zA-Z]+[0-9a-zA-Z_-]{0,63}$/
const canSubmit = computed(() => {
  // 表格数据
  if (!Array.isArray(dataRaw.value) || dataRaw.value?.length === 0) {
    help.value = '上传文件，并选择包含数据表格页'
    return false
  }
  // 列名称
  if (colNames.value.length === 0) {
    help.value = '通过【列名称（英文）行号】指定列名称；若表格中不包含列名称，【列名称（英文）行号】指定为0；通过【列标题（中文）行号】指定列标题；若，没有指定【列名称（英文）行号】，用【列标题】的汉语拼音作为列名称。'
    return false
  }
  help.value = ''

  // 数据行的方位，允许空
  if (dataEndRow.value > 0) {
    if (dataStartRow.value > dataEndRow.value) {
      help.value = '数据起始行不能大于结束行'
      return false
    }
    if (dataEndRow.value > rowTotal.value) {
      help.value = '数据结束行不能大于总行数' + rowTotal.value
      return false
    }
  }
  // 集合名称
  if (!clName.value || !CL_NAME_RE.test(clName.value)) {
    help.value = '指定要创建的集合名称'
    return false
  }

  help.value = ''

  return true
})

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

// 调用插件的页面
const Caller = window.parent
const message: PluginWidgetResult = { action: PluginWidgetAction.Created }
Caller.postMessage(message, '*')

/**接收结果*/
window.addEventListener('message', (event) => {
  const { data } = event
  const { clDir, response } = data
  // 打开插件时，指定了集合所属目录
  if (clDir) {
    assignedClDir.value = clDir
  }
  if (response) {
    noUpload.value = false
    if (typeof response === 'string') {
      responseContent.value = response
    }
  }
})

function handleChange(file: any, files: any) {
  if (files.length) noUpload.value = false
}

function handleUpload(req: any) {
  noUpload.value = true

  const reader = new FileReader()

  //将文件以二进制形式读入页面
  const fileType = req.file.type
  if (
    fileType ===
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    reader.readAsArrayBuffer(req.file)
  } else {
    ElMessage.error('不支持的文件格式')
    return
  }
  uploadFilename.value = req.file.name

  reader.onload = function (event: any) {
    const fileData = event.target.result

    const wb = XLSX.read(fileData, { type: 'binary', cellDates: true })
    /**
     * 选择sheet页后，要解析内容，设置导入相关参数
     */
    onChangeSheet = () => {
      const sh = wb.Sheets[selectedSheetName.value]
      const rowsAoa = XLSX.utils.sheet_to_json<string[]>(sh, { header: 1 })
      dataRaw.value = rowsAoa
      rowTotal.value = rowsAoa.length
    }
    /**
     * excel中的sheet
     */
    sheetNames.value.push(...wb.SheetNames)
    if (wb.SheetNames.length === 1) {
      selectedSheetName.value = wb.SheetNames[0]
      onChangeSheet()
    }
    // 修改状态
    isFileUploaded.value = true
  }
}

function onExecute() {
  const reg = /^[a-zA-z]/
  if (!reg.test(clName.value)) {
    return ElMessageBox.alert('请输入以英文字母开头的集合名称')
  }
  if (!nameRow.value && !titleRow.value) {
    return ElMessageBox.alert('英文行和中文行必须最少存在一个')
  }
  if (doSubmit) doSubmit()
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
