<template>
  <div class="flex flex-col gap-4 h-full w-full">
    <div>
      <el-button @click="onCancel" v-if="!executed">取消</el-button>
      <el-button @click="onClose" v-if="executed">关闭</el-button>
    </div>
    <el-tabs type="border-card">
      <el-tab-pane label="生成向量数据库">
        <el-form label-position="top">
          <el-form-item label="语言大模型">
            <el-select v-model="buildAction.modelName" placeholder="选择语言大模型">
              <el-option key="0" label="百度文心" value="baiduwenxin" />
              <el-option key="1" label="讯飞星火" value="xunfeispark" />
            </el-select>
          </el-form-item>
          <el-form-item label="语义检索字段（至少选1项）">
            <el-checkbox-group v-model="buildAction.vecField">
              <el-checkbox v-for="p in vecFieldOptions" name="vec-field" :label="p.name">{{ p.title }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item label="元数据字段（可选）">
            <el-checkbox-group v-model="buildAction.metaField">
              <el-checkbox v-for="p in metaFieldOptions" name="meta-field" :label="p.name">{{ p.title }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="onExecute('build')">生成向量数据库</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>
      <el-tab-pane label="检索向量数据库">
        <el-form label-position="top">
          <el-form-item label="检索模式">
            <el-select v-model="retrieveAction.perset" placeholder="检索模式">
              <el-option key="0" label="向量化内容" value="vector-doc" />
              <el-option key="1" label="关联文档内容" value="assoc-doc" />
              <el-option key="2" label="大模型生成内容" value="feed-llm" />
            </el-select>
          </el-form-item>
          <el-form-item label="检索内容">
            <el-input type="text" v-model="retrieveAction.text" placeholder="检索内容" />
          </el-form-item>
          <el-form-item label="最多匹配结果数">
            <el-input type="number" v-model="retrieveAction.numRetrieve" placeholder="匹配结果数" />
          </el-form-item>
          <el-form-item :label="docFieldLabel + '（至少选1项）'" v-if="retrieveAction.perset === 'assoc-doc'">
            <el-checkbox-group v-model="retrieveAction.docField">
              <el-checkbox v-for="p in docFieldOptions" name="doc-field" :label="p.name">{{ p.title }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <!-- <el-form-item label="元数据字段（可选）" v-if="retrieveAction.perset !== 'vector-doc'">
            <el-checkbox-group v-model="retrieveAction.metaField">
              <el-checkbox v-for="p in metaFieldOptions" name="meta-field" :label="p.name">{{ p.title
              }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item> -->
          <el-form-item>
            <el-button type="primary" @click="onExecute('retrieve')">检索向量数据库</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
    <div class="response-content flex-grow border border-gray-200 rounded-md overflow-auto p-2" v-if="responseContent">
      <div>{{ responseContent }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, toRaw } from 'vue'
import { ElMessage } from 'element-plus'

const schemaProps = ref<{ [k: string]: any }>({})
// 只有字符串字段才支持向量化
const vecFieldOptions = computed(() => {
  return Object.keys(schemaProps.value).reduce((props, k) => {
    let p = schemaProps.value[k]
    if (p.type === 'string') props.push({ name: k, title: p.title })
    return props
  }, [] as any[])
})
// 只有字符串字段才作为文档
const docFieldOptions = computed(() => {
  return Object.keys(schemaProps.value).reduce((props, k) => {
    let p = schemaProps.value[k]
    if (p.type === 'string') props.push({ name: k, title: p.title })
    return props
  }, [] as any[])
})
const metaFieldOptions = computed(() => {
  return Object.keys(schemaProps.value).reduce((props, k) => {
    let p = schemaProps.value[k]
    if (p.type !== 'object') props.push({ name: k, title: p.title })
    return props
  }, [] as any[])
})

const executed = ref(false)
const responseContent = ref<string>('')

const buildAction = reactive({ modelName: '', vecField: [], metaField: [] })

const docFieldLabel = computed(() => {
  return retrieveAction.perset === 'assoc-doc'
    ? '返回内容字段'
    : retrieveAction.perset === 'feed-llm'
      ? '背景资料字段'
      : ''
})

const retrieveAction = reactive({
  perset: 'vector-doc',
  text: '',
  numRetrieve: 1,
  docField: [],
  metaField: [],
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
  const { collection, response } = data
  if (collection && typeof collection === 'object') {
    const { schema } = collection
    schemaProps.value = schema.body.properties
  } else if (response) {
    const { vecDocs } = response
    if (Array.isArray(vecDocs)) {
      const content = vecDocs.map((d) => d.pageContent)
      responseContent.value = JSON.stringify(content, null, 2)
    } else if (typeof response === 'string') {
      responseContent.value = response
    }
  }
})

function onExecute(action: string) {
  /**
   * 构造消息
   */
  const message: PluginWidgetResult = {
    action: PluginWidgetAction.Execute,
    result: { action },
    handleResponse: true,
  }
  switch (action) {
    case 'build':
      {
        const vecField = toRaw(buildAction.vecField)
        if (vecField.length === 0) {
          ElMessage.error('没有指定要进行语义搜索的字段')
          return
        }
        const build: any = {
          modelName: toRaw(buildAction.modelName),
          vecField: vecField.join(','),
        }
        const metaField = toRaw(buildAction.metaField)
        if (metaField.length) {
          build.metaField = metaField.join(',')
        }
        message.result.build = build
      }
      break
    case 'retrieve':
      {
        const perset = toRaw(retrieveAction.perset)
        const text = toRaw(retrieveAction.text)
        if (!text) {
          ElMessage.error('没有输入要检索的内容')
          return
        }
        let docField
        if (perset === 'assoc-doc') {
          docField = toRaw(retrieveAction.docField)
          if (docField.length === 0) {
            ElMessage.error('没有指定要作为文档的字段')
            return
          }
        }
        const numRetrieve = toRaw(retrieveAction.numRetrieve)
        const retrieve: any = {
          perset: toRaw(retrieveAction.perset),
          text,
          numRetrieve:
            typeof numRetrieve === 'string' ? parseInt(numRetrieve) : numRetrieve,
          docField: docField?.join(','),
        }
        const metaField = toRaw(retrieveAction.metaField)
        if (metaField.length) {
          retrieve.metaField = metaField.join(',')
        }
        message.result.retrieve = retrieve
      }
      break
  }
  try {
    // 给调用方发送数据
    Caller.postMessage(message, '*')
    executed.value = true
  } catch (e) {
    console.log('未知错误', e)
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
