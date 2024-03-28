<template>
  <el-dialog :title="'筛选-' + schema.title" v-model="dialogVisible" :destroy-on-close="false"
    :close-on-click-modal="false">
    <el-form :model="Condition" label-width="60px" v-if="!IsEnumerableField && !IsBooleanField">
      <el-form-item label="按条件">
        <el-select v-model="Condition.byRule" placeholder="请选择筛选规则" @change="handleSelectChange">
          <el-option v-for="op in ByRuleOptions" :label="op.label" :value="op.value">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="关键字">
        <el-input placeholder="请输入内容,多个关键字以英文逗号间隔" v-model="Condition.byKeyword" @input="handleInputChange"></el-input>
      </el-form-item>
    </el-form>
    <el-form v-if="IsEnumerableField" :inline="true">
      <el-checkbox-group v-model="SelectedFieldValueOptions">
        <el-checkbox v-for="op in FieldValueOptions" :label="op.label" :value="op.value"></el-checkbox>
      </el-checkbox-group>
    </el-form>
    <el-form v-if="IsBooleanField" :inline="true">
      <el-radio-group v-model="FieldValueBoolean">
        <el-radio label="empty">空</el-radio>
        <el-radio label="yes">是</el-radio>
        <el-radio label="no">否</el-radio>
      </el-radio-group>
    </el-form>
    <div v-if="schema.groupable === true">
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
      <el-form :inline="true">
        <el-form-item>
          <el-button type="warning" @click="onClear">重制</el-button>
        </el-form-item>
        <el-form-item>
          <el-radio-group v-model="Condition.bySort" @change="handleSort">
            <el-radio-button label="asc">升序</el-radio-button>
            <el-radio-button label="desc">降序</el-radio-button>
            <el-radio-button label="">默认</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSubmit">筛选</el-button>
          <el-button type="default" @click="onBeforeClose">取消</el-button>
        </el-form-item>
      </el-form>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { ElTable } from 'element-plus'
import { computed, onMounted, reactive, ref, nextTick, toRaw } from 'vue'
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
        title: '',
        type: '',
        groupable: false,
        enum: [],
        enumGroups: []
      }
    }
  },
  conditions: {
    type: Array,
    default: []
  },
})
const dialogVisible = ref(props.dialogVisible)

const multipleTableRef = ref<InstanceType<typeof ElTable>>()
/**
 * 编辑的查询条件
 */
const Condition = reactive({
  byRule: 'include',
  byKeyword: '',
  bySort: '',
  columnName: props.columnName,
  rule: {
    filter: { [props.columnName]: {} } as { [k: string]: any },
    orderBy: {} as { [k: string]: any }
  },
  multipleSelection: [] as any[],
})
/**
 * 字段是否提供选项
 */
const IsEnumerableField = Array.isArray(props.schema.enum) || Array.isArray(props.schema.oneOf)
/**
 * 字段的可选值
 */
const FieldValueOptions = props.schema.enum || props.schema.oneOf
/**
 * 选择的字段可选值
 */
const SelectedFieldValueOptions = ref<any>([])
/**
 * 关键字匹配规则
 */
const ByRuleOptions = [
  {
    value: 'include',
    label: '包含'
  },
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
]
/**
 * 字段是否为boolean类型
 */
const IsBooleanField = props.schema.type === 'boolean'
/**
 * boolean类型字段筛选条件
 */
const FieldValueBoolean = ref('empty')

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
  const { multipleSelection } = Condition
  return multipleSelection.length === groups.length
})
const total = computed(() => {
  if (Condition.multipleSelection.length) {
    return Condition.multipleSelection
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
  Condition.rule.filter = {
    ...criterias.filter,
    ...Condition.rule.filter
  }
  Condition.rule.orderBy = criterias.orderBy
  if (!Condition.rule.filter[props.columnName]) {
    Condition.rule.filter[props.columnName] = {}
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
    Condition.rule.filter[props.columnName].feature = 'in'
  } else {
    kws = keyword
  }
  Condition.rule.filter[props.columnName].keyword = kws
}
const handleSelectChange = (val: any) => {
  Condition.rule.filter[props.columnName].feature = val
}
/**
 * 设置排序条件
 */
const handleSort = (type: string) => {
  Condition.bySort = type
  if (type) {
    Condition.rule.orderBy[props.columnName] = type
  } else {
    delete Condition.rule.orderBy[props.columnName]
  }
  const result = { condition: toRaw(Condition), isSort: true }
  emit('submit', result)
  closeDialog(result)
}
const handleSelectionChange = (val: Group[]) => {
  Condition.multipleSelection = val
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
  let orderBy = JSON.stringify(Condition.rule.orderBy) === '{}'
    ? criterias.orderBy
    : Condition.rule.orderBy

  return listByColumn?.(
    props.bucket,
    props.db,
    props.cl,
    props.columnName,
    page.at,
    page.size,
    { ...criterias.filter, ...Condition.rule.filter },
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
        Condition.multipleSelection = groups
      }
    } else {
      groups.push(...matchRes)
      Condition.multipleSelection = groups
      multipleTableRef.value!.toggleAllSelection()
    }
  })
}
const closeDialog = (newCl?: any) => {
  props.onClose(newCl)
}
/**
 * 清除筛选条件
 */
const onClear = () => {
  Condition.byRule = ''
  Condition.byKeyword = ''
  Condition.bySort = ''
  Condition.rule = { filter: {}, orderBy: {} }
  const result = { condition: toRaw(Condition), isClear: true }
  emit('submit', result)
  closeDialog(result)
}
const onBeforeClose = () => {
  closeDialog(null)
}
/**
 * 返回查询条件
 */
const onSubmit = () => {
  // if (!isAllElection || (isAllElection && !Condition.byKeyword)) {
  //   Condition.rule.filter[props.columnName] = {}
  //   Condition.rule.filter[
  //     props.columnName
  //   ].keyword = Condition.multipleSelection.map((ele: { title: any; }) => ele.title)
  //   Condition.rule.filter[props.columnName].feature = 'in'
  // }
  if (IsEnumerableField) {
    Condition.rule.filter[props.columnName] = {
      keyword: toRaw(SelectedFieldValueOptions.value),
      feature: 'in'
    }
  } else if (IsBooleanField) {
    const val = toRaw(FieldValueBoolean.value)
    Condition.rule.filter[props.columnName] = {
      keyword: val === 'yes' ? true : val === 'no' ? false : null,
    }
  }
  const result = { condition: toRaw(Condition) }
  emit('submit', result)
  closeDialog(result)
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
    const result: any = conditions.find(
      (item: any) => item.columnName === props.columnName
    )
    if (result) {
      Condition.byRule = result.byRule
      Condition.byKeyword = result.byKeyword
      Condition.bySort = result.bySort
      Condition.rule = result.rule
      if (Array.isArray(Condition.rule?.filter[props.columnName]?.keyword)) {
        SelectedFieldValueOptions.value.push(...Condition.rule.filter[props.columnName].keyword)
      } else if (IsBooleanField) {
        const kw = Condition.rule?.filter[props.columnName]?.keyword
        FieldValueBoolean.value = kw === true ? 'yes' : kw === false ? 'no' : 'empty'
      }
    }
  }
  // if (props.schema.groupable === true) updateByColumn(false)
  // nextTick(() => {
  // const $wrap = multipleTableRef.value!.$refs.scrollBarRef.wrap$
  // $wrap.addEventListener('scroll', () => {
  //   const scrollDistance =
  //     $wrap.scrollHeight - $wrap.scrollTop - $wrap.clientHeight
  //   if (scrollDistance <= 0) {
  //     console.log($wrap.scrollHeight, $wrap.scrollTop, $wrap.clientHeight)
  //     loadMore()
  //   }
  // })
  // })
})
</script>
