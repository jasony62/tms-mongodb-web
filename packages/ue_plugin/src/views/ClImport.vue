<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <el-alert v-if='help' :title="help" type="info" effect="dark" show-icon />
    <el-form-item>
      <el-upload ref="upload" v-loading="fileUploading" element-loading-text="上传文件..." :action="''"
        :http-request="FileHandler.upload" :file-list="fileList" :auto-upload="true" :limit="1"
        :before-upload="FileHandler.onBeforeUpload" :before-remove="FileHandler.onBeforeRemove"
        :on-exceed="FileHandler.onExceed">
        <el-button slot="trigger" type="primary">选取文件</el-button>
        <template #tip>
          <div class="el-upload__tip">需上传.xls、.xlsx类型的文件</div>
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
        <el-input v-model="clName" placeholder="英文名称"></el-input>
      </el-form-item>
      <el-form-item label="集合标题">
        <el-input v-model="clTitle" placeholder="中文名称"></el-input>
      </el-form-item>
      <el-form-item label="按表格顺序排序">
        <el-switch v-model="clIdOrderBy" active-value="asc" inactive-value="desc"></el-switch>
      </el-form-item>
      <el-form-item label="自由表格">
        <el-select v-model="clSpreadsheet" placeholder="请选择" style="width:80px;">
          <el-option label="否" value="no"></el-option>
          <el-option label="是" value="yes"></el-option>
        </el-select>
      </el-form-item>
    </el-form>
    <el-form :inline="true" v-if="isFileUploaded && rowTotal">
      <el-form-item label="集合文档字段定义" prop="schema_id">
        <el-select v-model="clSchemaId" clearable placeholder="选择已有的定义，或者自动创建" style="width: 240px;"
          @change="onChangeClSchema">
          <el-option-group v-for="schema in schemas" :key="schema.label" :label="schema.label">
            <el-option v-for="item in schema.options" :key="item._id" :label="item.title" :value="item._id" />
          </el-option-group>
        </el-select>
      </el-form-item>
      <el-form-item label="去除未在字段定义中列">
        <el-switch v-model="excludeSpare" :disabled="!clSchemaId"></el-switch>
      </el-form-item>
    </el-form>
    <el-form label-position="top">
      <el-form-item>
        <el-button type="primary" @click="onExecute" :disabled="!canSubmit">执行后关闭</el-button>
        <el-button type="primary" @click="onExecute(true)" :disabled="!canSubmit">执行</el-button>
        <el-button @click="onCancel" v-if="!executed">取消</el-button>
        <el-button @click="onClose" v-if="executed">关闭</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import * as XLSX from 'xlsx'
import { ElMessage, ElMessageBox } from 'element-plus'
import { pinyin } from 'pinyin-pro'

/**
 * 将中文字符串转换为拼音
 * 中文字转换为拼音，用下划线分割
 */
function strToPinYin(str: string): string {
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

/**
 * 将字符串值转换为schema定义的存储值
 *
 * @param attrs
 * @param valRaw
 * @param doc
 * @returns
 */
function storedValue(attrs: any, valRaw: any) {
  let valRet = valRaw // 返回的值
  const { type } = attrs

  // 填充默认值
  if (valRaw === null || valRaw === undefined) {
    if (type === 'string' && attrs.enum?.length && attrs.default?.length) {
      valRet = attrs.enum.find((ele: any) => ele.value === attrs.default).label
    } else if (
      type === 'array' &&
      attrs.enum?.length &&
      attrs.default?.length
    ) {
      const target = attrs.enum.map((ele: any) => {
        if (attrs.default.includes(ele.value)) {
          return ele.label
        }
      })
      valRet = target.join(',')
    } else {
      //存在默认值
      valRet = attrs.default || null
    }
    return valRet
  }
  if (type === 'boolean') {
    return ['是', 'yes'].includes(valRaw)
  }
  // 枚举值
  else if (type === 'array') {
    // 原始数据是空格分隔的字符串
    valRaw = valRaw.split(' ')
    if (Array.isArray(valRaw) && valRaw.length) {
      if (Array.isArray(attrs.enum) && attrs.enum.length) {
        valRet = attrs.enum.reduce((vals: any, o: any) => {
          if (valRaw.includes(o.label)) vals.push(o.value)
          return vals
        }, [])
      } else if (Array.isArray(attrs.anyOf) && attrs.anyOf.length) {
        valRet = attrs.anyOf.reduce((vals: any, o: any) => {
          if (valRaw.includes(o.label)) vals.push(o.value)
          return vals
        }, [])
      }
    }
  } else if (Array.isArray(attrs.enum) && attrs.enum.length) {
    const option = attrs.enum.find((o: any) => o.label === valRaw)
    if (option) valRet = option.value
  } else if (Array.isArray(attrs.oneOf) && attrs.oneOf.length) {
    const option = attrs.oneOf.find((o: any) => o.label === valRaw)
    if (option) valRet = option.value
  }

  return valRet
}
/**
 * 返回与列对应的字段定义数组
 */
function alignFieldAndColumn(schema: any, titles: string[], names: string[]): any[] {
  if (schema && typeof schema === 'object') {
    let fields: any[]
    if (Array.isArray(titles) && titles.length) {
      fields = titles.map((title: string, index) => {
        let s = Object.entries(schema).find(
          ([name, attrs]: [string, any]) => attrs.title === title
        )
        if (s) return { name: s[0], attrs: s[1] }
        return { name: names[index], spare: true }
      })
    } else if (Array.isArray(names) && names.length) {
      fields = names.map((colName: string, index) => {
        let s = Object.entries(schema).find(
          ([name]: [string, any]) => name === colName
        )
        if (s) return { name: colName, attrs: s[1] }
        return { name: colName, spare: true }
      })
    } else {
      fields = Object.keys(schema)
    }

    return fields
  }

  return []
}

const executed = ref(false)
const fileList = ref([])
const upload = ref<any>(null) // 文件上传组件
const fileUploading = ref(false) // 正在执行文件上传
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
const clTitle = ref('')
const clSchemaId = ref('')
const clIdOrderBy = ref('asc') // 集合默认排序
const clSpreadsheet = ref('no')
const excludeSpare = ref(false)
const schemas = reactive([
  {
    label: '数据库',
    options: [] as any[],
  },
  {
    label: '全局',
    options: [] as any[],
  },
])
let selectedSchema: any = null
// 指定的集合所属目录
const assignedClDir = ref()
// 帮助
const help = ref('')

/**
 * 处理文件上传相关事件
 */
const FileHandler = {
  /**
   * 处理文件上传
   * 读取文件内容进行处理
   * @param req 
  */
  upload(req: any) {
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
    clTitle.value = req.file.name

    reader.onload = function (event: any) {
      const fileData = event.target.result

      const wb = XLSX.read(fileData, { type: 'binary', cellDates: true })
      /**
       * 选择sheet页后，要解析内容，设置导入相关参数
       */
      onChangeSheet = () => {
        const sh = wb.Sheets[selectedSheetName.value]
        const rowsAoa = XLSX.utils.sheet_to_json<string[]>(sh, { header: 1, raw: false })
        dataRaw.value = rowsAoa
        rowTotal.value = rowsAoa.length
        if (!/^Sheet(\d*)$/.test(selectedSheetName.value))
          clTitle.value = selectedSheetName.value
      }
      /**
       * excel中的sheet
       */
      sheetNames.value.push(...wb.SheetNames)
      if (wb.SheetNames.length === 1) {
        selectedSheetName.value = wb.SheetNames[0]
        onChangeSheet()
      }
      // 结束上传文件
      fileUploading.value = false
      // 修改状态
      isFileUploaded.value = true
    }
  },
  /**
 * 执行上传文件前的操作
 */
  onBeforeUpload() {
    fileUploading.value = true
    return true
  },
  /**
   * 
   */
  onBeforeRemove() {
    sheetNames.value.splice(0, sheetNames.value.length)
    isFileUploaded.value = false
    return true
  },
  /**
   * 替换已经上传的文件
   */
  onExceed(files: any) {
    upload.value!.clearFiles()
    const file = files[0]
    upload.value!.handleStart(file)
    upload.value!.submit()
  }
}
// 列标题
const colTitles = computed(() => {
  if (!Array.isArray(dataRaw.value) || dataRaw.value.length === 0) return []
  if (titleRow.value > 0 && titleRow.value < dataRaw.value.length) {
    return dataRaw.value[titleRow.value - 1].map((t: string) => t.trim().replaceAll(/\s/g, ''))
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
    return colTitles.value.map((x: string) => strToPinYin(x))
  }
  return []
})
/**
 * 执行获取可用的字段定义
 */
const execListSchemas = () => {
  const message: PluginWidgetResult = {
    action: PluginWidgetAction.Execute,
    result: {
      method: 'ListSchemas',
    },
    handleResponse: true,
  }
  try {
    // 给调用方发送数据
    Caller.postMessage(message, '*')
    executed.value = true
  } catch (e) {
    console.log('未知错误', e)
  }
}
/**
 * 获得用户选择的schema
 * @param schemaId 
 */
const execGetSchema = (schemaId: string) => {
  const message: PluginWidgetResult = {
    action: PluginWidgetAction.Execute,
    result: {
      schemaId,
      method: 'GetSchema',
    },
    handleResponse: true,
  }
  try {
    // 给调用方发送数据
    Caller.postMessage(message, '*')
    executed.value = true
  } catch (e) {
    console.log('未知错误', e)
  }
}
// 用户选择schema
const onChangeClSchema = () => {
  selectedSchema = null
  if (clSchemaId.value) {
    execGetSchema(clSchemaId.value)
  } else {
    excludeSpare.value = false
  }
}

// 选择导入的excel文件中的sheet
let onChangeSheet: (() => void) | null

/**
 * 导入数据提交方法
 * 
 * 如果没有指定schema
 * 将行数据转换为json对象，用指定的名称列作为字段名称
 * 
 * 如果指定了schema
 * 如果指定了标题行，用标题匹配的字段定义名称作为文档的字段名称
 * 
 * 用户决定是否去除未在schema中定义的数据
 */
const doSubmit = (notClose = false) => {
  if (!Array.isArray(dataRaw.value) || dataRaw.value.length === 0) return

  const rowsAoa = dataRaw.value

  const lastRow = (dataEndRow.value <= 0 || dataEndRow.value > rowsAoa.length) ? rowsAoa.length : dataEndRow.value
  const slicedRowsAoa = toRaw(dataRaw.value).slice(dataStartRow.value - 1, lastRow)

  const titles = toRaw(colTitles.value)
  const names = toRaw(colNames.value)

  // 处理文档字段定义包含的数据
  if (selectedSchema) {
    const fields = alignFieldAndColumn(selectedSchema, titles, names)
    if (excludeSpare.value === true) {
      /**
       * 去除未在schema中定义的数据
       */
      const newRowsAoa = slicedRowsAoa.map((row: any[]) => {
        return row.reduce((newRow, cell, index) => {
          const field = fields[index]
          if (field.spare !== true) {
            const val = storedValue(field.attrs, cell)
            newRow.push(val)
          }
          return newRow
        }, [])
      })
      const colHeaders = fields.reduce((headers, field) => {
        if (field.spare !== true) {
          headers.names.push(field.name)
          headers.titles.push(field.attrs.title)
        }
        return headers
      }, { names: [], titles: [] })
      execUploadData(colHeaders.names, colHeaders.titles, newRowsAoa, notClose)
    } else {
      /**
       * 表格中包含的全部数据
       */
      const newRowsAoa = slicedRowsAoa.map((row: any[]) => {
        const newRow = []
        for (let index = 0; index < row.length; index++) {
          const cell = row[index]
          const field = fields[index]
          if (field.spare === true) {
            newRow.push(cell)
          } else {
            const val = storedValue(field.attrs, cell)
            newRow.push(val)
          }
        }
        return newRow
      })
      execUploadData(names, titles, newRowsAoa, notClose)
    }
  } else {
    execUploadData(names, titles, slicedRowsAoa, notClose)
  }
}
/**
 * 执行上传数据
 */
const execUploadData = (names: string[] | null, titles: string[] | null, rowsAoa: any[], notClose = false) => {
  if (Caller && Array.isArray(rowsAoa)) {
    const result: any = {
      method: 'UploadDocs',
      data: JSON.stringify(rowsAoa),
      clName: clName.value,
      clTitle: clTitle.value,
      dir_full_name: assignedClDir.value?.full_name,
      clIdOrderBy: clIdOrderBy.value,
      clSpreadsheet: clSpreadsheet.value,
      titles,
      names
    }
    if (clSchemaId.value)
      result.clSchemaId = clSchemaId.value

    const message: PluginWidgetResult = {
      action: PluginWidgetAction.Execute,
      result,
    }
    if (notClose === true) message.handleResponse = true

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
    help.value = '上传文件，选择包含数据的表格页'
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
    if (typeof response === 'string') {
      help.value = response
    } else if (typeof response === 'object') {
      if (Array.isArray(response.schemas) && response.schemas.length) {
        // 获得了可用的字段定义列表
        response.schemas.forEach((s: any) => {
          s.db ? schemas[0].options.push(s) : schemas[1].options.push(s)
        })
      } else if (response.schema && typeof response.schema === 'object') {
        // 获取选择的文档字段定义
        selectedSchema = response.schema
      }
    }
  }
})

function onExecute(notClose = false) {
  const reg = /^[a-zA-z]/
  if (!reg.test(clName.value)) {
    return ElMessageBox.alert('请输入以英文字母开头的集合名称')
  }
  if (!nameRow.value && !titleRow.value) {
    return ElMessageBox.alert('英文行和中文行必须最少存在一个')
  }
  if (doSubmit) doSubmit(notClose)
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

onMounted(() => {
  // 获取可用的字段定义
  execListSchemas()
})

</script>
