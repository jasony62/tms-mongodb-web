<template>
  <el-dialog :title="'筛选-' + currentPro.title" :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal">
    <el-form :model="condition" label-width="60px">
      <el-form-item label="按条件">
        <el-select v-model="condition.selectValue" clearable placeholder="请选择筛选规则" @change="handleSelectChange">
          <el-option v-for="item in condition.selectRules" :key="item.value" :label="item.label" :value="item.value">
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="关键字">
        <el-input placeholder="请输入内容,多个关键字以英文逗号间隔" v-model="condition.keyword" @input="handleInputChange"
          :maxlength="30000" show-word-limit></el-input>
      </el-form-item>
    </el-form>
    <div v-if="currentPro.groupable !== false">
      <el-table id="tables" ref="multipleTable" :data="condition.selectResult" tooltip-effect="dark" border
        max-height="270" v-loadmore="loadMore" @selection-change="handleSelectionChange">
        <el-table-column type="selection" width="55">
        </el-table-column>
        <el-table-column :label="'全选(' + selectedLen + ')'">
          <template slot-scope="scope">
            <div v-if="currentPro.type === 'array' && currentPro.enum">
              <span v-for="(i, v) in currentPro.enum" :key="v">
                <span v-if="scope.row.title && scope.row.title.includes(i.value)">{{ i.label }}&nbsp;</span>
              </span>
              <span>{{ '(' + scope.row.sum + ')' }}</span>
            </div>
            <div v-else-if="currentPro.type === 'string' && currentPro.enum">
              <span v-for="(i, v) in currentPro.enum" :key="v">
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
    <div slot="footer" class="dialog-footer">
      <el-button style="float:left" type="primary" :plain="condition.isCheckBtn[0]" @click="handleSort('asc')">升序
      </el-button>
      <el-button style="float:left" type="primary" :plain="condition.isCheckBtn[1]" @click="handleSort('desc')">降序
      </el-button>
      <el-button type="default" @click="dialogVisible2 = false">取消</el-button>
      <el-button type="warning" @click="onClear">清除筛选</el-button>
      <el-button type="primary" @click="onSubmit">提交</el-button>
    </div>
  </el-dialog>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue';

const emit = defineEmits(['submit'])
const props = defineProps({
  dialogVisible: { default: true },
  condition: {
    type: Object,
    default: function () {
      return {
        selectValue: '',
        keyword: '',
        selectRules: [
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
        ],
        selectResult: [],
        multipleSelection: [],
        isCheckBtn: [true, true],
        rule: {
          filter: {},
          orderBy: {}
        }
      }
    }
  }
})

const dialogVisible2 = ref(props.dialogVisible)

const destroyOnClose = ref(false)
const closeOnClickModal = ref(false)
const conditions = ref([] as any)
const currentPro = ref({} as any)

let listByColumn: Function
const columnName = ''
const page: any = {}
let timer: any = null

const isAllElection = computed(() => {
  const { multipleSelection, selectResult } = props.condition
  return multipleSelection.length === selectResult.length
})
const selectedLen = computed(() => {
  if (props.condition.multipleSelection.length) {
    return props.condition.multipleSelection
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
const toggleSelection = (rows: any[]) => {
  if (rows) {
    rows.forEach((row: any) => {
      // this.$refs.multipleTable.toggleRowSelection(row)
    })
  }
}
const onClear = () => {
  let cd = props.condition
  cd.selectValue = ''
  cd.keyword = ''
  cd.isCheckBtn = [true, true]
  cd.rule = { filter: {}, orderBy: {} }
  emit('submit', { rule: cd.rule, isClear: true })
}
const handleMultipleTable = () => {
  // this.$refs.multipleTable.toggleAllSelection()
  props.condition.multipleSelection = props.condition.selectResult
}
const handleInputChange = (val: any) => {
  props.condition.rule.filter = {
    ...conditions.filter,
    ...props.condition.rule.filter
  }
  props.condition.rule.orderBy = conditions.orderBy
  if (!props.condition.rule.filter[columnName]) {
    props.condition.rule.filter[columnName] = {}
  }
  setKeyword(val)
  clearTimeout(timer)
  if (!currentPro.value.groupable !== false) return
  timer = setTimeout(() => {
    updateByColumn(false)
  }, 500)
}
// 设置关键字
const setKeyword = (keyword: string) => {
  let kws
  if (
    ['array', 'string'].includes(currentPro.type) &&
    currentPro.enum
  ) {
    kws = keyword
      .split(',')
      .map((item: any) =>
        currentPro.enum
          .filter((enumItem: { label: any; }) => enumItem.label === item)
          .map((filterItem: { value: any; }) => filterItem.value)
      )
      .join()
      .split(',')
    props.condition.rule.filter[columnName].feature = 'in'
  } else {
    kws = keyword
  }
  props.condition.rule.filter[columnName].keyword = kws
}
const updateByColumn = (isLoadMore: boolean) => {
  let cd = props.condition
  listByColumn?.(
    columnName,
    { ...conditions.filter, ...cd.rule.filter },
    JSON.stringify(cd.rule.orderBy) === '{}'
      ? conditions.orderBy
      : cd.rule.orderBy,
    page.at,
    page.size
  ).then((matchRes: any[]) => {
    if (isLoadMore) {
      cd.selectResult.push(...matchRes)
      const message =
        matchRes.length > 0
          ? `成功加载${matchRes.length}条数据`
          : '全部数据加载完毕'
      ElMessage({ message, type: 'success', customClass: 'mzindex' })
      if (matchRes.length) {
        matchRes.forEach((ele: any) => {
          // this.$refs.multipleTable.toggleRowSelection(ele, true)
        })
        cd.multipleSelection = cd.selectResult
      }
    } else {
      cd.selectResult = matchRes
      handleMultipleTable()
    }
  })
}
const handleSelectChange = (val: any) => {
  props.condition.rule.filter[columnName].feature = val
}
const handleSort = (type: string) => {
  let cd = props.condition
  if (type === 'asc') {
    cd.isCheckBtn = [false, true]
  } else if (type === 'desc') {
    cd.isCheckBtn = [true, false]
  }

  cd.rule.orderBy[columnName] = type
  emit('submit', { rule: cd.rule, isCheckBtn: true })
}
const handleSelectionChange = (val: any) => {
  props.condition.multipleSelection = val
}
const onSubmit = () => {
  let cd = props.condition
  if (!isAllElection || (isAllElection && !cd.keyword)) {
    cd.rule.filter[
      columnName
    ].keyword = cd.multipleSelection.map((ele: { title: any; }) => ele.title)
    cd.rule.filter[columnName].feature = 'in'
  }
  emit('submit', { rule: cd.rule })
}
    // open(columnName, page, conditions, listByColumn, currentPro) {
    //   columnName = columnName
    //   this.page = page
    //   this.conditions = conditions
    //   this.listByColumn = listByColumn
    //   this.currentPro = currentPro
    //   if (!this.condition.rule.filter[columnName]) {
    //     this.condition.rule.filter[columnName] = {}
    //   }
    //   this.$mount()
    //   document.body.appendChild(this.$el)
    //   return new Promise(resolve => {
    //     this.$on('submit', selectCondition => {
    //       const { rule, isClear, isCheckBtn } = selectCondition
    //       this.dialogVisible = false
    //       document.body.removeChild(this.$el)
    //       resolve({
    //         rule,
    //         condition: { ...this.condition, columnName: columnName },
    //         isClear,
    //         isCheckBtn
    //       })
    //     })
    //   })
    // }
</script>
