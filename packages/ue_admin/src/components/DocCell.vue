<template>
  <span v-if="s.type === 'array' && s.items?.format === 'file'">
    <span v-for="(i, v) in row[k]" :key="v">
      <el-link type="primary" @click="downLoadFile(i)">{{
    i.name
  }}</el-link>
      <br />
    </span>
  </span>
  <div v-else class="max-h-16 overflow-y-auto">
    {{ readableValue() }}
  </div>
</template>

<script setup lang="ts">
const Props = defineProps({
  s: { type: Object, default: {} },
  k: { type: String, default: '' },
  row: { type: Object, default: {} },
  downloadFile: { type: Function, default: (i: number) => { } }
})

const readableValue = () => {
  const { s, row, k } = Props
  const val = row[k]
  switch (s.type) {
    case 'boolean':
      return val ? '是' : '否'
    case 'number':
    case 'string':
      if (s.enum?.length) {
        if (s.enumGroups?.length) {
          const group = s.enumGroups.find((g: any) => g.assocEnum.value === row[g.assocEnum.property])
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
          const group = s.enumGroups.find((g: any) => g.assocEnum.value === row[g.assocEnum.property])
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
          const group = s.enumGroups.find((g: any) => g.assocEnum.value === row[g.assocEnum.property])
          if (!group) return ''
          const options = s.enum.filter((o: any) => o.group === group.id && val.includes(o.value))
          return options.map((o: any) => o.label).join(' ')
        } else {
          const options = s.enum.filter((o: any) => val.includes(o.value))
          return options.map((o: any) => o.label).join(' ')
        }
      } else if (s.anyOf?.length) {
        if (s.enumGroups?.length) {
          const group = s.enumGroups.find((g: any) => g.assocEnum.value === row[g.assocEnum.property])
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

const downLoadFile = (i: number) => {
  Props.downloadFile(i)
}
</script>