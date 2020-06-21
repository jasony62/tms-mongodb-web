<template>
  <div>
    <el-button @click="createDocument" v-if="role==='admin'">添加数据</el-button>
    <el-table id="tables" :data="documents" stripe ref="multipleTable" :height="tableHeight" @selection-change="handleSelectDocument">
      <el-table-column fixed="left" type="selection" width="55"></el-table-column>
      <el-table-column v-for="(s, k) in collection.schema.body.properties" :key="k" :prop="k">
        <template slot="header">
          <i v-if="s.description" class="el-icon-info" :title="s.description"></i>
          <i v-if="s.required" style="color:red">*</i>
          <span> {{s.title}} </span>
          <img src="../assets/icon_filter.png" class="icon_filter" @click="handleSelect(s, k)">
        </template>
        <template slot-scope="scope">
          <span v-if="s.type==='boolean'">{{ scope.row[k] ? '是' : '否' }}</span>
          <span v-else-if="s.type==='array'&&s.format==='file'">
            <span v-for="(i, v) in scope.row[k]" :key="v">
              <a href @click="handleDownload(i)">{{i.name}}</a><br />
            </span>
          </span>
          <span v-else>{{ scope.row[k] }}</span>
        </template>
      </el-table-column>
      <el-table-column fixed="right" label="操作" width="150">
        <template slot-scope="scope">
          <el-button size="mini" @click="editDocument(scope.row)">修改</el-button>
          <el-button size="mini" @click="removeDocument(scope.row)" v-if="role==='admin'">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <tms-flex class="tmw-pagination">
      <span class="tmw-pagination__text">已选中 {{totalByChecked}} 条数据</span>
      <el-pagination background @size-change="handleSize" @current-change="handleCurrentPage" :current-page.sync="page.at" :page-sizes="[10, 25, 50, 100]" :page-size="page.size" layout="total, sizes, prev, pager, next" :total="page.total">
      </el-pagination>
    </tms-flex>
  </div>
</template>

<script>
import Vue from 'vue'
import { mapState, mapMutations } from 'vuex'
import { Frame, Flex } from 'tms-vue-ui'
import { Table, TableColumn, Button, Pagination, MessageBox, Message } from 'element-ui'

import DocEditor from '../components/DocEditor.vue'
import SelectCondition from '../components/SelectCondition.vue'
import createDocApi from '../apis/document'
import createCollectionApi from '../apis/collection'

const componentOptions = {
	components: {
    'tms-flex': Flex,
		'tms-frame': Frame,
		'el-table': Table,
		'el-table-column': TableColumn,
		'el-button': Button,
		'el-pagination': Pagination
	},
	props: {
		bucketName: String, 
		dbName: String, 
		clName: String,
		tmsAxiosName: String
	},
  data() {
    return {
			role: process.env.VUE_APP_USER_ROLE || 'admin',
      tableHeight: 0,
      filter: {},
      page: {
        at: 1,
        size: 100,
        total: 0
      },
      collection: { schema: { body: { properties: {} } } },
      dialogPage: {
        at: 1,
        size: 100
      }
    }
  },
  computed: {
    ...mapState(['documents', 'conditions'])
  },
  methods: {
    ...mapMutations([
      'conditionReset',
      'conditionDelBtn',
      'conditionDelColumn'
    ]),
    handleCondition() {
      let _obj = JSON.parse(JSON.stringify(this.conditions))
      if (!_obj.length) {
        return { filter: {}, orderBy: {} }
      }
      if (_obj.length === 1) {
        return {
          filter: _obj[0].rule.filter,
          orderBy: _obj[0].rule.orderBy
        }
      }
      return _obj
        .map(ele => ele.rule)
        .reduce((prev, curr) => {
          return {
            filter: Object.assign(prev.filter, curr.filter),
            orderBy: Object.assign(prev.orderBy, curr.orderBy)
          }
        })
    },
    listByColumn(
      columnName, 
      filter, 
      orderBy, 
      at, 
      size, 
      bucketName = this.bucketName, 
      dbName = this.dbName, 
      clName = this.clName
    ) {
      return createDocApi(this.TmsAxios(this.tmsAxiosName))
          .byColumnVal(
            bucketName, 
            dbName, 
            clName, 
            columnName, 
            filter, 
            orderBy, 
            at, 
            size
          )
    },
    handleSelect(obj, columnName) {
      this.dialogPage.at = 1
      const select = new Vue(SelectCondition)
      let filter, orderBy
      if (this.conditions.length) {
        const columnobj = this.conditions.find(
          ele => ele.columnName === columnName
        )
        const rule = this.handleCondition()
        if (columnobj) {
          select.condition.isCheckBtn = columnobj.isCheckBtn
          select.condition.keyword = columnobj.keyword
          select.condition.selectValue = columnobj.selectValue
          select.condition.rule = columnobj.rule
        }
        filter = rule.filter
        orderBy = rule.orderBy
      }
      this
        .listByColumn(
          columnName,
          this.conditions.length ? filter: undefined,
          this.conditions.length ? orderBy: undefined,
          this.dialogPage.at,
          this.dialogPage.size
        )
        .then(columnResult => {
          select.condition.selectResult = columnResult
          select.condition.multipleSelection = columnResult
          // 暂时先用延迟解决，该方法还需改进
          setTimeout(() => {
            select.toggleSelection(columnResult)
          }, 0)
        })
      select
        .open(
          columnName, 
          this.dialogPage, 
          this.handleCondition(),
          this.listByColumn
        )
        .then(rsl => {
          const { condition, isClear, isCheckBtn } = rsl
          this.$store.commit('conditionAddColumn', { condition })
          if (isClear) this.$store.commit('conditionDelColumn', { condition })
          let objPro = this.collection.schema.body.properties
          if (isCheckBtn) this.$store.commit('conditionDelBtn', { columnName })
          Object.keys(objPro).map((ele, index) => {
            const attrs = document.querySelectorAll(
              '#tables thead.has-gutter img'
            )[index]
            if (ele === columnName) {
              if (isClear) {
                attrs.src = require('../assets/icon_filter.png')
              } else if (isCheckBtn) {
                attrs.src = require('../assets/icon_' +
                  condition.rule.orderBy[columnName] +
                  '_active.png')
              } else {
                attrs.src = require('../assets/icon_filter_active.png')
              }
            } else if (isCheckBtn) {
              // 如果选择升降序规则，则需重置其他图标
              this.conditions.map(conEle => {
                if (ele === conEle.columnName) {
                  if (
                    conEle.rule &&
                    conEle.rule.filter &&
                    conEle.rule.filter[ele] &&
                    conEle.rule.filter[ele].keyword
                  ) {
                    attrs.src = require('../assets/icon_filter_active.png')
                  } else if (conEle.isCheckBtn.includes(false)) {
                    attrs.src = require('../assets/icon_' +
                      conEle.rule.orderBy[ele] +
                      '_active.png')
                  } else {
                    attrs.src = require('../assets/icon_filter.png')
                  }
                }
              })
            }
            return ele
          })
          this.listDocument()
        })
    }, 
    editDocument(doc) {
      let editor = new Vue(DocEditor)
      editor
        .open(this.bucketName, this.dbName, this.collection, doc)
        .then(newDoc => {
          Object.assign(doc, newDoc)
          this.$store.commit({
            type: 'updateDocument',
            document: newDoc
          })
        })
    },
    fnHandleResResult(result, isMultiple) {
      const realAt = Math.ceil((this.page.total - result.n) / this.page.size)
      this.page.at = realAt > this.page.at ? this.page.at : realAt ? realAt : 1
      this.listDocument()
      if (isMultiple) {
        this.$refs.multipleTable.clearSelection()
        this.multipleDocuments = []
      }
    },
    removeDocument(document) {
      MessageBox({
        title: '提示',
        message: '确定删除该条数据？',
        confirmButtonText: '确定',
        type: 'warning'
      })
        .then(() => {
          createDocApi(this.TmsAxios(this.tmsAxiosName))
            .remove(this.bucketName, this.dbName, this.clName, document._id)
            .then(() => {
              Message.success({ message: '删除成功' })
              this.fnHandleResResult({ n: 1 }, false)
            })
        })
        .catch(() => {})
    },
    handleSize(val) {
      this.page.size = val
      this.dialogPage.size = val
      this.listDocument()
    },
    handleCurrentPage(val) {
      this.page.at = val
      this.listDocument()
		},
		listDocument() {
      const rule = this.handleCondition()
			const { orderBy, filter } = rule
			this.filter = filter
      this.$store
        .dispatch({
          type: 'listDocument',
          bucket: this.bucketName,
          db: this.dbName,
          cl: this.clName,
          page: this.page,
          filter,
          orderBy
        })
        .then(result => {
          this.page.total = result.result.total
          this.tableHeight = window.innerHeight * 0.8
        })
		},
  },
  mounted() {
    createCollectionApi(this.TmsAxios(this.tmsAxiosName))
      .byName(this.bucketName, this.dbName, this.clName)
      .then(collection => {
        this.collection = collection
        this.listDocument()
      })
  },
  beforeDestroy() {
    this.conditionReset()
  }
}
export default componentOptions

export function createAndMount(Vue, props) {
	const CompClass = Vue.extend(componentOptions)

	const propsData = {
    tmsAxiosName: 'mongodb-api'
  }
  if (props && typeof props === 'object') Object.assign(propsData, props)
	new CompClass({
    propsData
  }).$mount()
}
</script>
<style lang="less" scoped>
.tmw-document {
  .icon-style {
    margin-left: 10px;
    cursor: pointer;
  }
  .icon-heightlight {
    color: #409eff;
  }
  .icon_filter {
    width: 15px;
    height: 15px;
    vertical-align: middle;
    cursor: pointer;
  }
}
</style>