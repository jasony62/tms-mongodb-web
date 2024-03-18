<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <div>
      <el-button @click="onCancel" v-if="!executed">取消</el-button>
      <el-button @click="onClose" v-if="executed">关闭</el-button>
    </div>
    <el-tabs type="border-card">
      <el-tab-pane label="上传文件">
        <el-form-item>
          <el-upload ref="upload" :action="''" :http-request="handleUpload" :file-list="fileList" :auto-upload="true"
            :limit="1" :on-change="handleChange">
            <el-button slot="trigger" type="primary">选取文件</el-button>
            <template #tip>
              <div class="el-upload__tip">需上传.xls、.xlsx、.json类型的文件，且不超过10MB</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form :inline="true" v-if="isUploadExcel">
          <el-form-item label="选择页">
            <el-select v-model="selectedSheetName" placeholder="选择" @change="onChangeSheet" style="width:180px;">
              <el-option v-for="name in sheetNames" :key="name" :label="name" :value="name" />
            </el-select>
          </el-form-item>
          <el-form-item :label="`共${rowTotal}行`" />
          <el-form-item label="数据名称行">
            <el-input-number v-model="nameRow" :step="1" :min="1" step-strictly />
          </el-form-item>
          <el-form-item label="数据起始行">
            <el-input-number v-model="startRow" :step="1" :min="1" step-strictly />
          </el-form-item>
        </el-form>
        <el-form-item>
          <el-button type="primary" @click="onExecute('upload')" :disabled="canSubmit">执行</el-button>
        </el-form-item>
      </el-tab-pane>
      <el-tab-pane label="下载excel模板文件">
        <el-form>
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
      </el-tab-pane>
    </el-tabs>
    <div class="response-content flex-grow border border-gray-200 rounded-md overflow-auto" v-if="responseContent">
      <pre>{{ responseContent }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import * as XLSX from 'xlsx';
import { ElMessage } from 'element-plus';

const executed = ref(false);
const responseContent = ref<string>("");
const fileList = ref([]);
const upload = ref<any>(null)
const noUploadFile = ref(true)
const leafLevel = ref<number>(0)
const isUploadExcel = ref(false)

// excel文件sheet页名称
const sheetNames = ref([] as string[])
const selectedSheetName = ref('')
/**
 * 数据起始行号
 * 标准模板，第1行是中文标题行，第2行是列名称行
 */
const startRow = ref(3)
const nameRow = ref(2)
const rowTotal = ref(0)

enum PluginWidgetAction {
  Created = "Created",
  Cancel = "Cancel",
  Execute = "Execute",
  Close = "Close",
}

interface PluginWidgetResult {
  action: PluginWidgetAction;
  result?: any;
  handleResponse?: boolean;
  applyAccessTokenField?: string; // 定用户输入中申请添加access_token的字段
  reloadOnClose?: boolean; // 关闭部件后是否要刷新数据
}

// 调用插件的页面
const Caller = window.parent;
const message: PluginWidgetResult = { action: PluginWidgetAction.Created };
Caller.postMessage(message, "*");

/**接收结果*/
window.addEventListener("message", (event) => {
  const { data } = event;
  const { response } = data;
  if (response) {
    noUploadFile.value = false
    if (typeof response === "string") {
      responseContent.value = response;
    } else if (typeof response === "object") {
      if (response.filePath) {
        window.open(response.filePath)
      } else {
        responseContent.value = JSON.stringify(response, null, 2);
      }
    }
  }
});

function handleChange(file: any, files: any) {
  if (files.length) noUploadFile.value = false
}

function setLevel(value: number) {
  if (Number.isNaN(value)) ElMessage.error('不支持的数据格式')
}

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

// 选择导入的excel文件中的sheet
let onChangeSheet: () => void
// 导入数据提交方法
let doSubmit: (() => void) | null
/**
 * 执行上传数据
 */
const execUploadData = (rowsJson: any[]) => {
  if (Caller && Array.isArray(rowsJson) && rowsJson.length) {
    const message: PluginWidgetResult = {
      action: PluginWidgetAction.Execute,
      result: { file: JSON.stringify(rowsJson) },
      applyAccessTokenField: "url",
    };
    try {
      // 给调用方发送数据
      Caller.postMessage(message, "*");
      executed.value = true;
    } catch (e) {
      console.log("未知错误", e);
    }
  }
}
function handleUpload(req: any) {
  noUploadFile.value = true

  const reader = new FileReader();

  //将文件以二进制形式读入页面
  const fileType = req.file.type
  if (fileType === 'application/json') {
    reader.readAsText(req.file);
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    reader.readAsArrayBuffer(req.file);
  } else {
    ElMessage.error('不支持的文件格式')
    return
  }
  /**
   * 完成加载文件
   */
  reader.onload = function (event: any) {
    const fileData = event.target.result

    if (fileType === 'application/json') {
      // 将导入文件转换json数组发给服务端
      const rowsJson = JSON.parse(fileData)
      isUploadExcel.value = false
      doSubmit = () => {
        execUploadData(rowsJson)
      }
    } else {
      const wb = XLSX.read(fileData, { type: 'binary' })
      /**
       * 选择sheet页后，要解析内容，设置导入相关参数
       */
      onChangeSheet = () => {
        const sh = wb.Sheets[selectedSheetName.value]
        isUploadExcel.value = true
        // header=1时，获得的是aoa数组
        const content = XLSX.utils.sheet_to_json(sh, { header: 1 })
        rowTotal.value = content.length
        // 准备提交方法
        if (content.length) {
          doSubmit = () => {
            if (startRow.value <= content.length) {
              const rowsJson = []
              let names = content[nameRow.value - 1] as string[]
              for (let i = startRow.value - 1; i < content.length; i++) {
                let row = content[i] as any[]
                let data = row.reduce((data, cell, index) => {
                  data[names[index]] = cell
                  return data
                }, {})
                // 清除全空的行
                if (Object.keys(data).length)
                  rowsJson.push(data)
              }
              execUploadData(rowsJson)
            }
          }
        } else {
          doSubmit = null
        }
      }
      /**
       * excel中的sheet
       */
      sheetNames.value.push(...wb.SheetNames)
      if (wb.SheetNames.length === 1) {
        selectedSheetName.value = wb.SheetNames[0]
        onChangeSheet()
      }
    }
  }
}

function onExecute(action: string) {
  if (action === 'upload') {
    if (doSubmit) doSubmit()
  } else if (action === 'download') {
    if (Caller) {
      const message: PluginWidgetResult = {
        action: PluginWidgetAction.Execute,
        result: { action: 'download', leafLevel: leafLevel.value },
        handleResponse: true
      };
      try {
        // 给调用方发送数据
        Caller.postMessage(message, "*");
        executed.value = true;
      } catch (e) {
        console.log("未知错误", e);
      }
    }
  } else {
    console.log('不识别的操作指令');
  }
}

function onCancel() {
  if (Caller) {
    const message: PluginWidgetResult = { action: PluginWidgetAction.Cancel };
    Caller.postMessage(message, "*");
  }
}

function onClose() {
  if (Caller) {
    const message: PluginWidgetResult = {
      action: PluginWidgetAction.Close,
      reloadOnClose: true,
    };
    Caller.postMessage(message, "*");
  }
}
</script>