<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <div>
      <el-form size="large">
        <el-form-item label="上传文件">
          <el-upload ref="upload" :action="''" :http-request="handleUpload" :file-list="fileList" :auto-upload="false"
            :limit="1" :on-change="handleChange">
            <el-button slot="trigger" type="primary">选取文件</el-button>
            <template #tip>
              <div class="el-upload__tip">需上传.xls、.xlsx、.json类型的文件，且不超过10MB</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="下载文件">
          <el-button slot="trigger" type="primary" @click="onExecute('download')">下载excel模板文件</el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onExecute('upload')" :disabled="noUpload">执行</el-button>
          <el-button @click="onCancel" v-if="!executed">取消</el-button>
          <el-button @click="onClose" v-if="executed">关闭</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div class="response-content flex-grow border border-gray-200 rounded-md overflow-auto" v-if="responseContent">
      <pre>{{ responseContent }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import * as XLSX from 'xlsx';
import { ElMessage } from 'element-plus';

const executed = ref(false);
const responseContent = ref<string>("");
const fileList = ref([]);
const upload = ref<any>(null)
const noUpload = ref(true)

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

    let rowsJson
    if (fileType === 'application/json') {
      rowsJson = JSON.parse(fileData)
    } else {
      const wb = XLSX.read(fileData, { type: 'binary' })
      const firstSheetName = wb.SheetNames[0]
      const sh = wb.Sheets[firstSheetName]
      rowsJson = XLSX.utils.sheet_to_json(sh)
    }

    if (Caller && typeof rowsJson === 'object') {
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
}

function onExecute(action: string) {
  if (action === 'upload') {
    if (!noUpload.value) upload.value?.submit()
  } else if (action === 'download') {
    if (Caller) {
      const message: PluginWidgetResult = {
        action: PluginWidgetAction.Execute,
        result: { action: 'download' },
        //pplyAccessTokenField: "url",
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
