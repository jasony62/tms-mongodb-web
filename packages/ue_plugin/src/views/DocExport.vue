<template>
  <div class="flex flex-col gap-4 h-full w-full doc-export">
    <div>
      <el-form size="large" label-position="right">
        <el-form-item label="导出类型">
          <el-radio-group v-model="outType" class="ml-4">
            <el-radio label="json" size="large">JSON</el-radio>
            <el-radio label="excel" size="large">Excel</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="保存方式" v-if="outType === 'json'">
          <el-radio-group v-model="outAmount" class="ml-4">
            <el-radio label="one" size="large">选中文档以数组方式保存为1个文件</el-radio>
            <el-radio label="more" size="large">选中文档作为独立文件保存到1个压缩文件</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="叶子节点数" v-if="outType === 'excel'" class="form-item">
          <el-input-number v-model="leafLevel" :step="1" :min="0" step-strictly @change="handleChange" />
          <div class="form-item__tip">* 0代表导出所有节点</div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onExecute" :disabled="!outType">执行</el-button>
          <el-button @click="onCancel" v-if="!executed">取消</el-button>
          <el-button @click="onClose" v-if="executed">关闭</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from 'element-plus';

const executed = ref(false);
const responseContent = ref<string>("");
const outType = ref<string>("json");
const outAmount = ref<string>("more");
const leafLevel = ref<number>(0);

enum PluginWidgetAction {
  Created = "Created",
  Cancel = "Cancel",
  Execute = "Execute",
  Close = "Close",
}

interface PluginWidgetResult {
  action: PluginWidgetAction
  result?: any;
  handleResponse?: boolean;
  applyAccessTokenField?: string; // 定用户输入中申请添加access_token的字段
  reloadOnClose?: boolean; // 关闭部件后是否要刷新数据
}

interface Result {
  outType: string;
  outAmount?: string
  leafLevel?: number
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

function handleChange(value: number) {
  if (Number.isNaN(value)) ElMessage.error('不支持的数据格式')
}

function onExecute() {
  let result: Result = {
    outType: outType.value
  }
  if (outType.value === 'json') {
    result.outAmount = outAmount.value
  } else {
    result.leafLevel = leafLevel.value
  }
  if (Caller && outType.value) {
    const message: PluginWidgetResult = { action: PluginWidgetAction.Execute, result: result }
    try {
      // 给调用方发送数据
      Caller.postMessage(message, '*')
      executed.value = true
    } catch (e) {
      console.log('未知错误', e)
    }
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

<style scoped lang="scss">
.doc-export {

  .form-item {
    :deep(.el-form-item__content) {
      flex-direction: column;
      align-items: flex-start;
    }

    .form-item__tip {
      font-size: 12px;
      color: var(--el-text-color-regular);
    }
  }
}
</style>