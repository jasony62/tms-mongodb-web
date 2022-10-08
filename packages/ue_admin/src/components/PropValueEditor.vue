<template>
  <GDialog v-model="dialogState" max-width="500">
    <div class="wrapper">
      <div class="content">
        <div class="name">{{ field.fullname }}</div>
        <div>
          <tms-json-doc ref="$jde" class="w-full h-full overflow-auto" :schema="schema" :value="document"
            :enable-paste="true" :hide-root-title="true" :hide-root-description="true"></tms-json-doc>
        </div>
      </div>
      <div class="actions flex flex-row gap-4">
        <button @click="submit">修改</button>
        <button @click="dialogState = false">关闭</button>
      </div>
    </div>
  </GDialog>
</template>

<script setup lang="ts">
import TmsJsonDoc, { DocAsArray, Field } from 'tms-vue3-ui/dist/es/json-doc'
import { JSONSchemaBuilder } from 'tms-vue3-ui/dist/es/json-schema'
import { computed, PropType, ref } from 'vue'
import * as _ from 'lodash'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  field: { type: Object as PropType<Field>, required: true },
  editDoc: { type: Object, required: true },
  onSubmit: { type: Function, default: () => { } }
})

const emit = defineEmits(['update:modelValue'])

const dialogState = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  },
})

const { field, editDoc } = props
// 编辑的属性定义
const ClonedSchema = _.cloneDeep(field.schemaProp)
ClonedSchema.path = ''
// 如果是数组中的子项目，需要指定属性名称
if (ClonedSchema.name === '[*]') ClonedSchema.name = 'arrayItem'
/**构造完整的schema定义*/
const builder = new JSONSchemaBuilder()
builder.flatten({ type: 'object' })
builder.props.push(ClonedSchema)
// 用于生成表单的完整属性定义
const schema = builder.unflatten()
// 表单对应的文档
const document = _.set({}, ClonedSchema.name, editDoc.get(field.fullname))

const $jde = ref<{ editDoc: DocAsArray } | null>(null)
/**
 * 通过对话框修改数据
 */
const submit = () => {
  const newValue = $jde.value?.editDoc.get(ClonedSchema.name)
  props.onSubmit(newValue)
  dialogState.value = false
}
</script>

<style scoped lang="scss">
.wrapper {
  color: #000;

  .content {
    padding: 20px;
  }

  .name {
    margin-bottom: 8px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    padding: 10px 20px;
    border-top: 1px solid rgba(0, 0, 0, 0.12);
  }
}
</style>
