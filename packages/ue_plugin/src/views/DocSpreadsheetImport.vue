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
    <div v-if="operation === 'excel' || operation === 'json'">
      <el-form label-width="120px">
        <el-form-item>
          <el-upload ref="upload" :action="''" :http-request="handleUpload" :file-list="fileList" :auto-upload="false"
            :limit="1" :on-change="handleChange">
            <el-button slot="trigger" type="primary">选取文件</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="数据起始行">
          <el-input-number v-model="startRow" :step="1" :min="1" step-strictly />
        </el-form-item>
        <el-divider />
        <el-form-item label="重建表格">
          <el-switch v-model="writeOptions.rebuild"></el-switch>
        </el-form-item>
        <el-form-item label="覆盖数据" v-if="writeOptions.rebuild === false">
          <div>
            <el-switch v-model="writeOptions.overwrite"></el-switch>
            <div class="mt-2">
              <el-alert title="覆盖或插入" type="info" :closable="false" />
            </div>
          </div>
        </el-form-item>
        <el-form-item label="写入位置" v-if="writeOptions.rebuild === false">
          <div>
            <el-input-number v-model="writeOptions.startIndex" :step="1" :min="minStartIndex" step-strictly />
            <div class="mt-2">
              <el-alert title="插入写入时，指定为0，从结尾开始写入" type="info" :closable="false" />
            </div>
          </div>
        </el-form-item>
        <el-divider />
        <el-form-item>
          <el-button type="primary" @click="onExecute('upload')" :disabled="noUpload">执行</el-button>
        </el-form-item>
      </el-form>
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
import { computed, reactive, ref, toRaw, watch } from "vue"
import * as XLSX from 'xlsx'
import { ElMessage } from 'element-plus'

const operation = ref('excel') // 要执行的操作
const executed = ref(false)
const responseContent = ref<string>("")
const fileList = ref([])
const upload = ref<any>(null)
const noUpload = ref(true)
const leafLevel = ref<number>(0)

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

// 数据起始行号
const startRow = ref(2)
// 数据写入位置的最小值，覆盖写入时为1，插入写入时为0
const minStartIndex = computed(() => writeOptions.overwrite ? 1 : 0)
/**
 * 数据写入设置
 */
const writeOptions = reactive({
  rebuild: false,// 重建自由表格
  overwrite: false,// 覆盖已有数据，否则插入
  startIndex: 0 // 数据写入位置
})
// 保证插入时，写入起始位置的最小值为1
watch(() => writeOptions.overwrite, (newVal) => {
  if (newVal === true && writeOptions.startIndex <= 1) {
    writeOptions.startIndex = 1
  }
})

// 调用插件的页面
const Caller = window.parent;
const message: PluginWidgetResult = { action: PluginWidgetAction.Created };
Caller.postMessage(message, "*");

/**接收结果*/
window.addEventListener("message", (event) => {
  const { data } = event;
  const { response } = data;
  if (response) {
    noUpload.value = false
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
  if (files.length) noUpload.value = false
}

function setLevel(value: number) {
  if (Number.isNaN(value)) ElMessage.error('不支持的数据格式')
}

function handleUpload(req: any) {
  noUpload.value = true

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

  reader.onload = function (event: any) {
    const fileData = event.target.result
    let contentType = ''
    let rowsJson
    if (fileType === 'application/json') {
      rowsJson = JSON.parse(fileData)
      contentType = 'json'
    } else {
      const wb = XLSX.read(fileData, { type: 'binary' })
      const firstSheetName = wb.SheetNames[0]
      const sh = wb.Sheets[firstSheetName]
      rowsJson = XLSX.utils.sheet_to_json(sh, { header: 1 })
      if (Array.isArray(rowsJson) && rowsJson.length) {
        const deleteCount = startRow.value - 1
        if (deleteCount > 0 && deleteCount <= rowsJson.length) {
          rowsJson.splice(0, deleteCount)
        }
      }
      contentType = 'aoa'
    }

    if (Caller && contentType && rowsJson && typeof rowsJson === 'object') {
      const message: PluginWidgetResult = {
        action: PluginWidgetAction.Execute,
        result: { content: JSON.stringify(rowsJson), contentType, writeOptions: toRaw(writeOptions) },
        applyAccessTokenField: "url",
      }
      try {
        // 给调用方发送数据
        Caller.postMessage(message, "*");
        executed.value = true;
      } catch (e) {
        console.log("未知错误", e);
      }
    }
  }
}

function onExecute(action: string) {
  if (action === 'upload') {
    if (!noUpload.value) upload.value?.submit()
  } else if (action === 'download') {
    if (Caller) {
      const message: PluginWidgetResult = {
        action: PluginWidgetAction.Execute,
        result: { action: 'download', leafLevel: leafLevel.value },
        handleResponse: true
      }
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