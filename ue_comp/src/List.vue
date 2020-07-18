<template>
  <div class="tmw-document">
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
          <span v-else-if="s.type==='array' && s.items && s.items.format==='file'">
            <span v-for="(i, v) in scope.row[k]" :key="v">
              <a href @click="handleDownload(i)">{{i.name}}</a><br />
            </span>
          </span>
          <span v-else-if="s.type==='array' && s.enum">
            <span v-for="(i, v) in s.enum" :key="v">
              <span v-if="scope.row[k] && scope.row[k].includes(i.value)">{{i.label}}&nbsp;</span>
            </span>
          </span>
          <span v-else-if="s.type==='string' && s.enum">
            <span v-for="(i, v) in s.enum" :key="v">
              <span v-if="scope.row[k] === i.value">{{i.label}}</span>
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
    <div class="tmw-pagination">
      <span class="tmw-pagination__text">已选中 {{totalByChecked}} 条数据</span>
      <el-pagination background @size-change="handleSize" @current-change="handleCurrentPage" :current-page.sync="page.at" :page-sizes="[10, 25, 50, 100]" :page-size="page.size" layout="total, sizes, prev, pager, next" :total="page.total">
      </el-pagination>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import store from '../../ue_mongo/src/store'
import { Table, TableColumn, Button, Checkbox, CheckboxGroup, Pagination, Message, MessageBox } from 'element-ui'
import DocEditor from './DocEditor.vue'
import SelectCondition from './SelectCondition.vue'
import createCollectionApi from '../../ue_mongo/src/apis/collection'
import createDocApi from '../../ue_mongo/src/apis/document'

const componentOptions = {
	components: {
		'el-table': Table,
		'el-table-column': TableColumn,
		'el-button': Button,
		'el-checkbox': Checkbox,
    'el-checkbox-group': CheckboxGroup,
    'el-pagination': Pagination
	},
	props: {
		bucketName: String, 
		dbName: String, 
		clName: String,
		tmsAxiosName: {
			type: String,
			default: 'mongodb-api'
		}
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
      multipleDocuments: [],
      collection: { schema: { body: { properties: {} } } },
      dialogPage: {
        at: 1,
        size: 100
      }
    }
	},
	computed: {
		documents() {
			return store.state.documents
		},
		conditions() {
			return store.state.conditions
		}
  },
	methods: {
		conditionReset() {
			return store.commit('conditionReset')
		},
		conditionDelBtn() {
			return store.commit('conditionDelBtn')
		},
		conditionDelColumn() {
			return store.commit('conditionDelColumn')
		},
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
          this.listByColumn,
          this.collection.schema.body.properties[columnName]
        )
        .then(rsl => {
          const { condition, isClear, isCheckBtn } = rsl
          store.commit('conditionAddColumn', { condition })
          if (isClear) store.commit('conditionDelColumn', { condition })
          let objPro = this.collection.schema.body.properties
          if (isCheckBtn) store.commit('conditionDelBtn', { columnName })
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
    handleSelectDocument(rows) {
      this.multipleDocuments = rows
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
    editDocument(doc) {
      let editor = new Vue(DocEditor)
      editor
        .open(this.tmsAxiosName, this.bucketName, this.dbName, this.collection, doc)
        .then(newDoc => {
          Object.assign(doc, newDoc)
          store.commit('updateDocument', { document: newDoc })
        })
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
        .catch(error => alert(error))
    },
		handleDownload(file) {
			const access_token = sessionStorage.getItem('access_token')
      window.open(`${process.env.VUE_APP_BACK_API_FS}${file.url}?access_token=${access_token}`)
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
      this.filter = rule.filter
			const { orderBy, filter } = rule
			createDocApi(this.TmsAxios(this.tmsAxiosName))
				.list(this.bucketName, this.dbName, this.clName, this.page, filter, orderBy)
				.then(result => {
						const documents =  result.docs
						store.commit('documents', { documents })
						this.page.total = result.total
						this.tableHeight = window.innerHeight * 0.8
				})
		}
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

export function createAndMount(Vue, propsData, id) {
	const ele = document.getElementById(id)
	const CompClass = Vue.extend(componentOptions)
  
  new CompClass({
    propsData
	}).$mount(ele)
}
</script>
<style lang="less" scoped>
.tmw-document {
  position: relative;
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
