<template>
  <tms-frame class="tmw-document" :display="{ header: true, footer: false, right: true }" :leftWidth="'20%'">
    <template v-slot:header>
      <el-breadcrumb separator-class="el-icon-arrow-right">
        <el-breadcrumb-item :to="{ path: '/home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'database', params: { dbName: dbName } }">{{dbName}}</el-breadcrumb-item>
        <el-breadcrumb-item>{{clName}}</el-breadcrumb-item>
      </el-breadcrumb>
    </template>
    <template v-slot:center>
      <tms-flex class="tmw-filter">
        <el-input  v-model="keyword" size="small" placeholder="请输入关键词" class="tmw-filter__inputWithSelect">
          <el-select v-model="option" placeholder="选择条件" slot="prepend" @change="handleSelect">
            <el-option v-for="(s, k) in collection.schema.body.properties" :key="k" :label="s.title" :value="k"></el-option>
          </el-select>
          <el-dropdown slot="append">
            <el-button icon="el-icon-s-operation"></el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item v-for="(f, k) in features" :key="k"><el-radio v-model="feature" :label="f.value">{{f.title}}</el-radio></el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </el-input>
        <el-button size="small"  icon="el-icon-search" @click="handleSearch">搜索</el-button>
      </tms-flex>
      <div class="tmw-tags">
        <el-tag v-for="tag in tags" :key="tag.id" closable :disable-transitions="false" @close="removeTag(tag)">{{tag.property.title}}:{{tag.keyword}},{{tag.feature.title}}</el-tag>
      </div>
      <el-table id="tables" :data="documents" stripe ref="multipleTable" :height="tableHeight" @selection-change="handleSelectDocument">
        <el-table-column fixed="left" type="selection" width="55"></el-table-column>
        <el-table-column
          v-for="(s, k) in collection.schema.body.properties"
          :key="k"
          :prop="k">
          <template slot="header">
            <span>{{ s.title }}</span>
            <img src="../assets/icon_filter.png" class="icon_filter" @click="handleSelect1(s, k)">
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="150">
          <template slot-scope="scope">
            <el-button size="mini" @click="editDocument(scope.row)">修改</el-button>
            <el-button size="mini" @click="removeDocument(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <tms-flex class="tmw-pagination">
        <span class="tmw-pagination__text">已选中 {{totalByChecked}} 条数据</span>
        <el-pagination 
          background
          @size-change="handleSize" 
          @current-change="handleCurrentPage" 
          :current-page.sync="page.at" 
          :page-sizes="[10, 25, 50, 100]" 
          :page-size="page.size" 
          layout="total, sizes, prev, pager, next"
          :total="page.total">
        </el-pagination>
      </tms-flex>
    </template>
    <template v-slot:right>
      <tms-flex direction="column">
        <div><el-button @click="createDocument">添加数据</el-button></div>
        <el-dropdown @command="batchEditDocument">
          <el-button>批量修改<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <el-upload action="#" :show-file-list="false" :http-request="importDocument">
          <el-button>导入数据</el-button>
        </el-upload>
        <div><el-button @click="exportDocument">导出数据</el-button></div>
        <el-dropdown @command="batchRemoveDocument">
          <el-button>批量删除<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <hr/>
        <el-checkbox-group v-model="moveCheckList">
          <el-checkbox v-for="(t, k) in plugins.document.transforms.move" :label="t.name" :key="k">{{t.label}}</el-checkbox>
        </el-checkbox-group>
        <el-dropdown @command="batchMoveDocument">
          <el-button>数据迁移<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <hr/>
        <div v-for="s in plugins.document.submits" :key="s.id">
          <el-checkbox-group v-model="s.checkList">
            <el-checkbox v-for="(t, k) in plugins.document.transforms[s.id]" :label="t.name" :key="k">{{t.label}}</el-checkbox>
          </el-checkbox-group>
          <el-button @click="handlePlugin(s, null)" v-if="!s.batch">{{s.name}}</el-button>
          <el-dropdown v-if="s.batch">
            <el-button>{{s.name}}<i class="el-icon-arrow-down el-icon--right"></i></el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item><el-button type="text" @click="handlePlugin(s, 'all')" :disabled="totalByAll==0">按全部({{totalByAll}})</el-button></el-dropdown-item>
              <el-dropdown-item><el-button type="text" @click="handlePlugin(s, 'filter')" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-button></el-dropdown-item>
              <el-dropdown-item><el-button type="text" @click="handlePlugin(s, 'checked')" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-button></el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
          <hr v-if="plugins.document.transforms[s.id]"/>
        </div>
      </tms-flex>      
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { mapState, mapMutations } from 'vuex'
import { Frame, Flex } from 'tms-vue-ui'
Vue.use(Frame)
  .use(Flex)
import { Table, TableColumn, Input, Row, Col, Button, Upload, Pagination, Tag, Message, MessageBox, Radio, Checkbox, CheckboxGroup, Dropdown, DropdownMenu, DropdownItem, Breadcrumb, BreadcrumbItem } from 'element-ui'
Vue.use(Table)
  .use(TableColumn)
  .use(Input)
  .use(Row)
  .use(Col)
  .use(Button)
  .use(Upload)
  .use(Pagination)
  .use(Tag)
  .use(Radio)
  .use(Checkbox)
  .use(CheckboxGroup)
  .use(Dropdown)
  .use(DropdownMenu)
  .use(DropdownItem)
  .use(Breadcrumb)
  .use(BreadcrumbItem)

import DocEditor from '../components/DocEditor.vue'
import ColumnValueEditor from '../components/ColumnValueEditor.vue'
import DomainEditor from '../components/DomainEditor.vue'
import SelectCondition from '../components/SelectCondition.vue'
import MoveByRulePlugin from '../plugins/move/Main.vue'
import { collection as apiCol, doc as apiDoc } from '../apis'
import apiPlugins from '../plugins'

export default {
  name: 'Collection',
  props: ['dbName', 'clName'],
  data() {
    return {
      tableHeight: 0,
      moveCheckList: [],
      option: "",
      keyword: "",
      feature: "",
      filter: {},
      tags: [],
      page: {
				at: 1,
				size: 100,
				total: 0    
      },
      multipleDocuments: [],
      collection: { schema: { body: { properties: {} } } },
      plugins: { document: { submits: [], transforms: {} } },
      dialogPage: {
        at: 1,
				size: 10,
      }
    }
  },
  computed: {
    ...mapState(['documents', 'conditions']),
    features() {
      let features = {
        start: {
          title: '以"'+this.keyword+'"开头',
          value: 'start'
        },
        notStart: {
          title: '不以"'+this.keyword+'"开头',
          value: 'notStart'
        },
        end: {
          title: '以"'+this.keyword+'"结尾',
          value: 'end'
        },
        notEnd: {
          title: '不以"'+this.keyword+'"结尾',
          value: 'notEnd'
        }
      }
      return features
    },
    totalByAll() {
      return Object.keys(this.filter).length ? 0 : this.page.total
    },
    totalByFilter() {
      return Object.keys(this.filter).length ? this.page.total : 0
    },
    totalByChecked() {
      return this.multipleDocuments.length
    }
  },
  watch: {
		filter: {
			handler() {
				this.page.at = 1
				this.listDocument()
			},
			deep: true
		}
	},
  methods: {
    ...mapMutations([
      'conditionReset',
      'conditionDelBtn',
      'conditionDelColumn'
    ]),
    handleCondition() {
      if(!this.conditions.length) {
        return {filter: {}, orderBy: {}}
      }
      if(this.conditions.length === 1){
        return {
          filter: this.conditions[0].rule.filter,
          orderBy: this.conditions[0].rule.orderBy
        }
      }
      return this.conditions.map(ele => ele.rule).reduce((prev, curr) => {
        return {
          filter: Object.assign(prev.filter, curr.filter),
          orderBy: Object.assign(prev.orderBy, curr.orderBy)
        }
      })
    },
    handleSelect1(obj, columnName) {
      this.dialogPage.at = 1
      const select = new Vue(SelectCondition)
      if(this.conditions.length) {
        const columnobj = this.conditions.find(ele => ele.columnName === columnName)
        const rule = this.handleCondition()
        if(columnobj){
          select.condition.isCheckBtn = columnobj.isCheckBtn
          select.condition.keyword = columnobj.keyword
          select.condition.selectValue = columnobj.selectValue
          select.condition.rule = columnobj.rule
        }
        const { filter, orderBy } = rule
        apiDoc.byColumnVal(this.dbName, this.clName, columnName, filter, orderBy, this.dialogPage.at, this.dialogPage.size).then(columnResult => {
          select.condition.selectResult = columnResult
          // 暂时先用延迟解决，该方法还需改进
          setTimeout(() => {
            select.toggleSelection(columnResult)
          }, 0)
        })
      } else {
        apiDoc.byColumnVal(this.dbName, this.clName, columnName, undefined, undefined, this.dialogPage.at, this.dialogPage.size).then(columnResult => {
          select.condition.selectResult = columnResult
        })
      }
      select.open(columnName, this.dbName, this.clName, this.dialogPage).then(rsl => {
        const { condition, isClear, isCheckBtn } = rsl
        this.$store.commit('conditions', {condition})
        if (isClear) this.conditionDelColumn({condition})
        let objPro = this.collection.schema.body.properties
        Object.keys(objPro).map((ele, index) => {
          if (ele === columnName) {
            const attrs = document.querySelectorAll('#tables thead.has-gutter img')[index]
            if(isClear) {
              attrs.src = require('../assets/icon_filter.png')
            }else if(isCheckBtn) {
              attrs.src = require('../assets/icon_'+ condition.rule.orderBy[columnName] + '_active.png')
            }else {
              attrs.src = require('../assets/icon_filter_active.png')
            }
          }
          return ele
        })
        if(isCheckBtn) this.conditionDelBtn({columnName})
        this.listDocument(true)
      })
    },
    handleSelect() {
      if (this.filter[this.option]) {
        let obj = this.filter[this.option]
        this.keyword = obj.keyword
        this.feature = obj.feature
        return
      } 
      this.keyword = ""
      this.feature = ""
    },
    handleSearch() {
      if (!this.option || !this.keyword) {
        Message.info({ message: '请确认是否选择条件或输入关键词'})
        return false
      }
      let obj = {}
      this.$set(obj, 'keyword', this.keyword.replace(/^\s+|\s+$/g,""))
      this.$set(obj, 'feature', this.feature)
      this.$set(this.filter, this.option, obj)
      if (this.tags.length) {
        this.tags.forEach(tag => {
          if (tag && tag.id===this.option) {
            tag.keyword = this.keyword
            tag.feature = this.feature ? this.features[this.feature] : {}
          } 
        })
        if (this.tags.every(tag => tag.id !== this.option)) {
          this.addTag()
        }
      } else {
        this.addTag()
      }
    },
    addTag() {
      this.tags.push({
        id: this.option,
        property: this.collection.schema.body.properties[this.option],
        keyword: this.keyword,
        feature: this.feature ? this.features[this.feature] : {}
      })
    },
    removeTag(tag) {
      this.tags.forEach((item, index) => {
        if (item.id===tag.id) {
          this.tags.splice(index, 1)
          this.$delete(this.filter, tag.id)
          if (this.option===tag.id) {
            this.option = ""
            this.keyword = ""
            this.feature = ""
          }
        }
      })
      this.listDocument()
    },
    handleSelectDocument(rows) {
      this.multipleDocuments = rows
    },
    fnGetMultipleIds() {
      let ids = this.multipleDocuments.map(document => document._id)
      return ids
    },
    listPlugin() {
      apiPlugins.plugin.list().then(plugins => {
        this.moveCheckList = plugins.document.transforms.move.map(option => option.name)
        plugins.document.submits.forEach(submit => {
         
          let transforms = plugins.document.transforms[submit.id]
          submit.checkList = transforms ? transforms.map(item => item.name) : []
        })
        this.plugins = plugins
      })
    },
    listDocument(flag) {
      if (flag) {
        const rule = this.handleCondition()
        const { orderBy, filter } = rule
        this.$store.dispatch({
          type: 'listDocument',
          db: this.dbName,
          cl: this.clName,
          page: this.page,
          filter,
          orderBy
        }).then(result => {
          this.page.total = result.result.total
          this.tableHeight = window.innerHeight * 0.8
        })
        return
      }
      this.$store.dispatch({
        type: 'listDocument',
        db: this.dbName,
        cl: this.clName,
        page: this.page,
        filter: this.filter,
      }).then(result => {
        this.page.total = result.result.total
        this.tableHeight = window.innerHeight * 0.8
      })
    },
    createDocument() {
      let editor = new Vue(DocEditor)
      editor.open(this.dbName, this.collection).then(() => {
        this.listDocument()
      })
    },
    editDocument(doc) {
      let editor = new Vue(DocEditor)
      editor.open(this.dbName, this.collection, doc).then(newDoc => {
        Object.assign(doc, newDoc)
        this.$store.commit({
          type: 'updateDocument',
          document: newDoc
        })
      })
    },
    fnSetReqParam(command, checkList) {
      let param, transforms
      param = {}
      transforms = checkList && checkList.join(',')
      switch(command){
        case 'all':
          param.filter = 'ALL'
        break;
        case 'filter':
          param.filter = this.filter
        break;
        case 'checked':
          param.docIds = this.fnGetMultipleIds()
      } 
      return {param: param, transforms: transforms}
    },
    fnHandleResResult(result, isMultiple) {
      const realAt =  Math.ceil((this.page.total - result.n) / this.page.size) 
      this.page.at = realAt > this.page.at ? this.page.at : (realAt ? realAt : 1)
      this.listDocument()
      if (isMultiple) {
        this.$refs.multipleTable.clearSelection()
        this.multipleDocuments = []
      }
    },
    batchEditDocument(command) {
      let {param} = this.fnSetReqParam(command), editor
      editor = new Vue(ColumnValueEditor)
      editor.open(this.collection).then(columns => {
        Object.assign(param, {'columns': columns})
        apiDoc.batchUpdate(this.dbName, this.collection.name, param).then(result => {
          Message.success({ message: '已成功修改' + result.n + '条' })
          this.listDocument()
        })
      })
    },
    removeDocument(document) {
      MessageBox({
        title: '提示',
        message: '确定删除该条数据？',
        confirmButtonText: '确定',
        type: 'warning'
      }).then(() => {
        apiDoc.remove(this.dbName, this.clName, document._id).then(() => {
          Message.success({ message: '删除成功' })
          this.fnHandleResResult({n:1}, false)
        })
      }).catch(() => {})
    },
    batchRemoveDocument(command) {
      let { param } = this.fnSetReqParam(command)
      MessageBox({
        title: '提示',
        message: '确定删除这些数据？',
        confirmButtonText: '确定',
        type: 'warning'
      }).then(() => {
        apiDoc.batchRemove(this.dbName, this.clName, param).then(result => {
          Message.success({ message: '已成功删除' + result.n + '条'})
          this.fnHandleResResult(result, true)
        })
      }).catch(() => {})
    },
    fnMoveDocument(dbName, clName, transforms, param, pTotal, aMTotal, aMPTotal) {
      let msg = Message.info({ message: '开始迁移数据...', duration: 0}),
          _this = this;
      async function fnmove(dbName, clName, transforms, param, pTotal, aMTotal, aMPTotal) {
        let  result = await apiDoc.move(_this.dbName, _this.clName, dbName, clName, transforms, param, pTotal, aMTotal, aMPTotal).catch(() => msg.close()) 
        if (result) {
          let {planTotal, alreadyMoveTotal, alreadyMovePassTotal, alreadyMoveFailTotal, spareTotal} = result
          msg.message = '正在迁移数据...'
          if (spareTotal <= 0) { 
            msg.message = '成功迁移' + alreadyMovePassTotal + '条，失败' + alreadyMoveFailTotal + '条'   
            setTimeout(() => msg.close(), 1000) 
            return result
          }
          return fnmove(dbName, clName, transforms, param, planTotal, alreadyMoveTotal, alreadyMovePassTotal)
        }
      }
      return fnmove(dbName, clName, transforms, param, pTotal, aMTotal, aMPTotal)
    },
    batchMoveDocument(command) {
      let {param, transforms} = this.fnSetReqParam(command, this.moveCheckList), confirm, config
      confirm = new Vue(DomainEditor)
      config = { title: "迁移到" }
      confirm.open(config).then(fields => {
        const { dbName, clName } = fields
        if (command==='checked') {
          this.fnMoveDocument(dbName, clName, transforms, param, 0, 0, 0).then(result => {
            this.fnHandleResResult({n:result.alreadyMovePassTotal}, true) 
          })
        } else {
          this.fnMoveDocument(dbName, clName, transforms, param, 0, 0, 0).then(() => {
            this.page.at = 1
            this.listDocument()
          })
        }
      })
    },
    importDocument(data) {
      let formData = new FormData()
      const msg = Message.info({message: '正在导入数据...', duration: 0})
      formData.append('file', data.file)
      apiDoc.import(this.dbName, this.clName, formData).then(() => {
        this.listDocument()
        setTimeout(() => msg.close(), 1000)
      })
    },
    exportDocument() {
      apiDoc.export(this.dbName, this.clName).then(result => {
        const access_token = sessionStorage.getItem('access_token')
        window.open(`${process.env.VUE_APP_BACK_API_BASE}/download/down?access_token=${access_token}&file=${result}`)
      })
    },
    pluginOfMoveByRule(transforms) {
      let confirm, config
      confirm = new Vue(DomainEditor)
      config = { title: "选定规则表" }
      confirm.open(config).then(fields => {
        const { dbName: ruleDbName, clName: ruleClName } = fields
        let moveByRule = new Vue(MoveByRulePlugin)
        moveByRule.showDialog(this.dbName, this.clName, ruleDbName, ruleClName, transforms)
      })
    },
    pluginOfSync(transforms, param, pTotal, aSTotal, aSPTotal) {
      let msg = Message.info({ message: '开始同步数据...', duration: 0}),
          _this = this;
      async function fnsync(transforms, param, pTotal, aSTotal, aSPTotal) {
        let {planTotal, alreadySyncTotal, alreadySyncPassTotal, alreadySyncFailTotal, spareTotal} = await apiPlugins.sync.syncMobilePool(_this.dbName, _this.clName, transforms, param, pTotal, aSTotal, aSPTotal).catch(() => msg.close()) 
        msg.message = '正在同步数据...'
        if (spareTotal <= 0) {  
          msg.message = '成功迁移' + alreadySyncPassTotal + '条，失败' + alreadySyncFailTotal + '条'    
          _this.listDocument()
          setTimeout(() => msg.close(), 1500)
          return false
        }
        fnsync(transforms, param, planTotal, alreadySyncTotal, alreadySyncPassTotal)
      }
      fnsync(transforms, param, pTotal, aSTotal, aSPTotal)
    },
    handlePlugin(submit, type) {
      let transforms = submit.checkList.join(',')
      let { param } = type ? this.fnSetReqParam(type) : { param: null }
      switch(submit.id) {
        case 'moveByRule':
          this.pluginOfMoveByRule(transforms, param)
          break;
        case 'syncMobilePool':
          this.pluginOfSync(transforms, param, 0, 0, 0)
      }
    },
    handleSize(val) {
			this.page.size = val
			this.listDocument()
		},
		handleCurrentPage(val) {
			this.page.at = val
			this.listDocument()
    }
  },
  mounted() {
    apiCol.byName(this.dbName, this.clName).then(collection => {
      this.collection = collection
      this.listDocument()
      this.listPlugin()
    })
  },
  beforeDestroy(){
    this.conditionReset()
  }
}
</script>

<style lang="less" src="../assets/css/common.less"></style>
<style scoped>
.tmw-document .icon-style {
  margin-left: 10px;
  cursor: pointer;
}
.tmw-document .icon-heightlight {
  color: #409EFF;
}
.tmw-document .icon_filter {
  width: 15px;
  height: 15px;
  vertical-align: middle;
  cursor: pointer;
}
</style>