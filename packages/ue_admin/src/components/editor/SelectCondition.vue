<template>
  <el-dialog :title="'筛选-' + schema.title" v-model="dialogVisible" :destroy-on-close="false"
    :close-on-click-modal="false">
    <el-form :model="condition" label-width="60px">
      <el-form-item label="按条件">
        <el-select v-model="condition.byRule" clearable placeholder="请选择筛选规则" @change="handleSelectChange">
          <el-option v-for="reg in regs" :key="reg.value" :label="reg.label" :value="reg.value">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="关键字">
        <el-input placeholder="请输入内容,多个关键字以英文逗号间隔" v-model="condition.byKeyword" @input="handleInputChange"
          :maxlength="30000" show-word-limit></el-input>
      </el-form-item>
    </el-form>
    <div v-if="schema.groupable !== false">
      <el-table id="tables" ref="multipleTableRef" :data="groups" tooltip-effect="dark" :border="true" height="270"
        @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55">
        </el-table-column>
        <el-table-column :label="'全选(' + total + ')'">
          <template #default="scope">
            <div v-if="schema.type === 'array' && schema.enum">
              <span v-for="(i, v) in schema.enum" :key="v">
                <span v-if="scope.row.title && scope.row.title.includes(i.value)">{{ i.label }}&nbsp;</span>
              </span>
              <span>{{ '(' + scope.row.sum + ')' }}</span>
            </div>
            <div v-else-if="schema.type === 'string' && schema.enum">
              <span v-for="(i, v) in schema.enum" :key="v">
                <span v-if="scope.row.title === i.value">{{ i.label }}</span>
              </span>
              <span>{{ '(' + scope.row.sum + ')' }}</span>
            </div>
            <div v-else>
              {{ scope.row.title + '(' + scope.row.sum + ')' }}
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <template #footer>
      <el-radio-group style="float:left" v-model="condition.bySort" size="large" @change="handleSort">
        <el-radio-button label="asc">升序</el-radio-button>
        <el-radio-button label="desc">降序</el-radio-button>
      </el-radio-group>
      <el-button type="default" @click="onBeforeClose">取消</el-button>
      <el-button type="warning" @click="onClear">清除筛选</el-button>
      <el-button type="primary" @click="onSubmit">提交</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { ElTable } from 'element-plus'
import { computed, onMounted, reactive, ref, nextTick } from 'vue';
import apiDoc from '@/apis/document'

interface Group {
  sum: number,
  title: string
}

const emit = defineEmits(['submit'])
const props = defineProps({
  onClose: { type: Function, default: (newData: any) => { } },
  dialogVisible: { default: true },
  bucket: { type: String, default: '' },
  db: { type: String, default: '' },
  cl: { type: String, default: '' },
  columnName: { type: String, default: '' },
  schema: {
    type: Object,
    default: () => {
      return {
        type: '',
        groupable: false,
        enum: []
      }
    }
  },
  conditions: {
    type: Array,
    default: []
  },
})

const multipleTableRef = ref<InstanceType<typeof ElTable>>()
const regs = reactive([
  {
    value: 'start',
    label: '开头是'
  },
  {
    value: 'notStart',
    label: '开头不是'
  },
  {
    value: 'end',
    label: '结尾是'
  },
  {
    value: 'notEnd',
    label: '结尾不是'
  }
])
let condition = reactive({
  byRule: "",
  byKeyword: "",
  bySort: "",
  columnName: props.columnName,
  rule: {
    filter: {} as { [k: string]: any },
    orderBy: {} as { [k: string]: any }
  },

  multipleSelection: [] as any[],
})
let timer: any = null
let page = reactive({
  at: 1,
  size: 100
})
let criterias = reactive({
  filter: {} as { [k: string]: any },
  orderBy: {} as { [k: string]: any }
})
let groups = reactive([] as Group[])

const isAllElection = computed(() => {
  const { multipleSelection } = condition
  return multipleSelection.length === groups.length
})
const total = computed(() => {
  if (condition.multipleSelection.length) {
    return condition.multipleSelection
      .map((ele: { sum: any; }) => ele.sum)
      .reduce((prev: any, curr: any) => prev + curr)
  } else {
    return 0
  }
})
const loadMore = () => {
  page.at++
  updateByColumn(true)
}
const handleInputChange = (val: any) => {
  condition.rule.filter = {
    ...criterias.filter,
    ...condition.rule.filter
  }
  condition.rule.orderBy = criterias.orderBy
  if (!condition.rule.filter[props.columnName]) {
    condition.rule.filter[props.columnName] = {}
  }
  setKeyword(val)
  clearTimeout(timer)
  if (!props.schema.groupable !== false) return
  timer = setTimeout(() => {
    updateByColumn(false)
  }, 500)
}
const setKeyword = (keyword: string) => {
  let kws
  if (
    ['array', 'string'].includes(props.schema.type) &&
    props.schema.enum
  ) {
    kws = keyword
      .split(',')
      .map((item: any) =>
        props.schema.enum
          .filter((enumItem: { label: any; }) => enumItem.label === item)
          .map((filterItem: { value: any; }) => filterItem.value)
      )
      .join()
      .split(',')
    condition.rule.filter[props.columnName].feature = 'in'
  } else {
    kws = keyword
  }
  condition.rule.filter[props.columnName].keyword = kws
}
const handleSelectChange = (val: any) => {
  condition.rule.filter[props.columnName].feature = val
}
const handleSort = (type: string) => {
  condition.bySort = type
  condition.rule.orderBy[props.columnName] = type
  emit('submit', { condition: condition, isCheckBtn: true })
  closeDialog({ condition: condition, isCheckBtn: true })
}
const handleSelectionChange = (val: Group[]) => {
  condition.multipleSelection = val
}
const listByColumn = (
  bucketName = props.bucket,
  dbName = props.db,
  clName = props.cl,
  columnName: string,
  page: number,
  size: number,
  filter: any,
  orderBy: any,
) => {
  return apiDoc.byColumnVal(
    bucketName,
    dbName,
    clName,
    columnName,
    page,
    size,
    filter,
    orderBy,
  )
}
const updateByColumn = (isLoadMore: boolean) => {
  let orderBy = JSON.stringify(condition.rule.orderBy) === '{}'
    ? criterias.orderBy
    : condition.rule.orderBy

  return listByColumn?.(
    props.bucket,
    props.db,
    props.cl,
    props.columnName,
    page.at,
    page.size,
    { ...criterias.filter, ...condition.rule.filter },
    orderBy
  ).then((matchRes: Group[]) => {
    if (isLoadMore) {
      const message =
        matchRes.length > 0
          ? `成功加载${matchRes.length}条数据`
          : '全部数据加载完毕'
      ElMessage.success({ message })
      if (matchRes.length) {
        matchRes.forEach((row: Group) => {
          groups.push(row)
          multipleTableRef.value!.toggleRowSelection(row, true)
        })
        condition.multipleSelection = groups
      }
    } else {
      groups.push(...matchRes)
      condition.multipleSelection = groups
      multipleTableRef.value!.toggleAllSelection()
    }
  })
}
const closeDialog = (newCl?: any) => {
  props.onClose(newCl)
}
const onClear = () => {
  condition.byRule = ""
  condition.byKeyword = ""
  condition.bySort = ""
  condition.rule = { filter: {}, orderBy: {} }
  emit('submit', { condition: condition, isClear: true })
  closeDialog({ condition: condition, isClear: true })
}
const onBeforeClose = () => {
  closeDialog(null)
}
const onSubmit = () => {
  if (!isAllElection || (isAllElection && !condition.byKeyword)) {
    condition.rule.filter[props.columnName] = {}
    condition.rule.filter[
      props.columnName
    ].keyword = condition.multipleSelection.map((ele: { title: any; }) => ele.title)
    condition.rule.filter[props.columnName].feature = 'in'
  }
  emit('submit', { condition: condition })
  closeDialog({ condition: condition })
}

onMounted(async () => {
  const conditions = props.conditions
  if (conditions.length) {
    // 抽出全部的筛选条件
    conditions.forEach((ele: any) => {
      Object.assign(criterias.filter, ele.rule.filter)
      Object.assign(criterias.orderBy, ele.rule.orderBy)
    })
    // 查找是否有当前列的筛选条件
    let result: any = conditions.find(
      (ele: any) => ele.columnName === props.columnName
    )
    if (result) {
      condition.byRule = result.byRule
      condition.byKeyword = result.byKeyword
      condition.bySort = result.bySort
      condition.rule = result.rule
    }
  }
  if (props.schema.groupable === true) updateByColumn(false)
  nextTick(() => {
    // const $wrap = multipleTableRef.value!.$refs.scrollBarRef.wrap$
    // $wrap.addEventListener('scroll', () => {
    //   const scrollDistance =
    //     $wrap.scrollHeight - $wrap.scrollTop - $wrap.clientHeight
    //   if (scrollDistance <= 0) {
    //     console.log($wrap.scrollHeight, $wrap.scrollTop, $wrap.clientHeight)
    //     loadMore()
    //   }
    // })
  })
})
</script>
