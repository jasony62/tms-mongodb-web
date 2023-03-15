<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <el-form label-position="top">
      <el-form-item label="列名称（英文）行号">
        <div>
          <el-input-number v-model="nameRow" :step="1" :min="1" disabled step-strictly />
          <div class="el-upload__tip">* 默认按顺序以英文字母作为列名称</div>
        </div>
      </el-form-item>
      <el-form-item label="列标题名称（中文）行号">
        <div>
          <el-input-number v-model="titleRow" :step="1" step-strictly />
          <div class="el-upload__tip">* 默认与列名称一致</div>
        </div>
      </el-form-item>
      <el-form-item label="集合名称">
        <div>
          <el-input v-model="clName"></el-input>
          <div class="el-upload__tip">* 应符合集合名称（英文）规则</div>
        </div>
      </el-form-item>
      <el-form-item>
        <el-upload ref="upload" :action="''" :http-request="handleUpload" :file-list="fileList" :auto-upload="false"
          :limit="1" :on-change="handleChange">
          <el-button slot="trigger" type="primary">选取文件</el-button>
          <template #tip>
            <div class="el-upload__tip">需上传.xls、.xlsx类型的文件，且不超过10MB</div>
          </template>
        </el-upload>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onExecute" :disabled="noUpload">执行</el-button>
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
import { ref } from "vue";
import * as XLSX from 'xlsx';
import { ElMessage, ElMessageBox } from 'element-plus';

const executed = ref(false);
const responseContent = ref<string>("");
const fileList = ref([]);
const upload = ref<any>(null)
const noUpload = ref(true)

const nameRow = ref(1)
const titleRow = ref()
const clName = ref("")

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
  if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    reader.readAsArrayBuffer(req.file);
  } else {
    ElMessage.error('不支持的文件格式')
    return
  }

  reader.onload = function (event: any) {
    const fileData = event.target.result

    const wb = XLSX.read(fileData, { type: 'binary' })
    const firstSheetName = wb.SheetNames[0]
    const sh = wb.Sheets[firstSheetName]
    let data = XLSX.utils.sheet_to_json(sh)
    const excelJson = XLSX.utils.sheet_to_json(sh, { header: 1 })
    const headersName = nameRow.value ? excelJson[nameRow.value - 1] : excelJson[0]
    const headersTitle = titleRow.value ? excelJson[titleRow.value - 1] : null
    data = headersTitle ? data.slice(1) : data

    if (Caller && typeof data === 'object') {
      const message: PluginWidgetResult = {
        action: PluginWidgetAction.Execute,
        result: {
          file: JSON.stringify(data),
          fileName: req.file.name,
          headers: headersName,
          headersTitle,
          clName: clName.value
        },
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

function onExecute() {
  const reg = /^[a-zA-z]/
  if (!reg.test(clName.value)) {
    return ElMessageBox.alert('请输入以英文字母开头的集合名称')
  }
  if (!noUpload.value) upload.value?.submit()
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