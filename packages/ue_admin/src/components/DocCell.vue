<template>
  <div class="h-full py-2" @click="onCellClick">
    <span v-if="propAttrs.type === 'array' && propAttrs.items?.format === 'file'">
      <span v-for="(i, v) in doc[propName]" :key="v">
        <el-link type="primary" @click="downLoadFile(i)">{{
    i.name
  }}</el-link>
        <br />
      </span>
    </span>
    <div v-else-if="propAttrs.type === 'string' && propAttrs.format === 'longtext'">
      <el-tooltip :content="longtextTip()" raw-content placement="right" effect="light">
        <div>{{ readableValue() }}</div>
      </el-tooltip>
    </div>
    <div v-else>
      {{ readableValue() }}
    </div>
  </div>
</template>

<script setup lang="ts">

const Props = defineProps({
  propAttrs: { type: Object, default: {} },
  propName: { type: String, required: true },
  doc: { type: Object, default: {} },
  downloadFile: { type: Function, default: (i: number) => { } }
})

const emit = defineEmits(['docCellClick'])

const onCellClick = () => {
  const { propName } = Props
  emit('docCellClick', propName)
}

// 转换为可读内容
const readableValue = () => {
  const { propAttrs: s, propName, doc } = Props
  const val = doc[propName]
  switch (s.type) {
    case 'boolean':
      return val ? '是' : '否'
    case 'number':
    case 'string':
      if (s.enum?.length) {
        if (s.enumGroups?.length) {
          const group = s.enumGroups.find((g: any) => g.assocEnum.value === doc[g.assocEnum.property])
          if (!group) return ''
          const option = s.enum.find((o: any) => o.group === group.id && o.value === val)
          if (!option) return ''
          return option.label
        } else {
          const option = s.enum.find((o: any) => o.value === val)
          if (!option) return ''
          return option.label
        }
      } else if (s.oneOf?.length) {
        if (s.enumGroups?.length) {
          const group = s.enumGroups.find((g: any) => g.assocEnum.value === doc[g.assocEnum.property])
          if (!group) return ''
          const option = s.oneOf.find((o: any) => o.group === group.id && o.value === val)
          if (!option) return ''
          return option.label
        } else {
          const option = s.oneOf.find((o: any) => o.value === val)
          if (option) return option.label
        }
      }
      break
    case 'array':
      if (!Array.isArray(val) || val.length === 0) return ''
      if (s.enum?.length) {
        if (s.enumGroups?.length) {
          const group = s.enumGroups.find((g: any) => g.assocEnum.value === doc[g.assocEnum.property])
          if (!group) return ''
          const options = s.enum.filter((o: any) => o.group === group.id && val.includes(o.value))
          return options.map((o: any) => o.label).join(' ')
        } else {
          const options = s.enum.filter((o: any) => val.includes(o.value))
          return options.map((o: any) => o.label).join(' ')
        }
      } else if (s.anyOf?.length) {
        if (s.enumGroups?.length) {
          const group = s.enumGroups.find((g: any) => g.assocEnum.value === doc[g.assocEnum.property])
          if (!group) return ''
          const options = s.anyOf.filter((o: any) => o.group === group.id && val.includes(o.value))
          return options.map((o: any) => o.label).join(' ')
        } else {
          const options = s.anyOf.filter((o: any) => val.includes(o.value))
          return options.map((o: any) => o.label).join(' ')
        }
      }
      break
  }

  return val
}

// 长文本提示
const longtextTip = () => {
  const { propName, doc } = Props
  const val = doc[propName]
  return `<div style="width:200px;">${val}</div>`
}

const downLoadFile = (i: number) => {
  Props.downloadFile(i)
}
</script>