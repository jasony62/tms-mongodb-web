<template>
  <tms-frame class="tmw-document" :display="frameDisplay" :leftWidth="'20%'">
    <template v-slot:left>
      <el-card class="box-card" shadow="never">
        <div slot="header" class="clearfix">
          <tms-flex direction="row-reverse">
            <el-button @click="resetSelectedGroupNode" type="text">清除选择</el-button>
          </tms-flex>
        </div>
        <el-tree ref="groupNodeTree" :highlight-current="true" :data="groupData" default-expand-all node-key="id" :props="defaultProps" @node-click="selectGroupNode">
          <span class="custom-tree-node" slot-scope="{ node, data }">
            <span>
              {{ node.label }}
              <el-badge v-if="data.count" class="mark" type="primary" :value="data.count" />
            </span>
          </span>
        </el-tree>
      </el-card>
    </template>
    <template v-slot:center>
      <el-table id="table" :data="documents" stripe ref="documentsTable" :max-height="tableHeight" @selection-change="handleSelectDocument">
        <el-table-column fixed="left" type="selection" width="55"></el-table-column>
        <el-table-column v-for="(s, k) in properties" :key="k" :prop="k">
          <template slot="header">
            <i v-if="s.description" class="el-icon-info" :title="s.description"></i>
            <i v-if="s.required" style="color:red">*</i>
            <span>{{s.title}}</span>
            <img src="../assets/icon_filter.png" class="icon_filter" @click="handleFilterByColumn(s, k)" />
          </template>
          <template slot-scope="scope">
            <span v-if="s.type==='boolean'">{{ scope.row[k] ? '是' : '否' }}</span>
            <span v-else-if="s.type==='array'&& s.items && s.items.format==='file'">
              <span v-for="(i, v) in scope.row[k]" :key="v">
                <a href="#" @click="handleDownload(i)">{{i.name}}</a>
                <br />
              </span>
            </span>
            <span v-else-if="s.type === 'array' && s.enum && s.enum.length">
              <span v-if="s.enumGroups && s.enumGroups.length">
                <span v-for="(g, i) in s.enumGroups" :key="i">
                  <span v-if="scope.row[g.assocEnum.property]===g.assocEnum.value">
                    <span v-for="(e, v) in s.enum" :key="v">
                      <span v-if="e.group===g.id && scope.row[k] && scope.row[k].length && scope.row[k].includes(e.value)">{{e.label}}&nbsp;</span>
                    </span>
                  </span>
                </span>
              </span>
              <span v-else>
                <span v-for="(i, v) in s.enum" :key="v">
                  <span v-if="scope.row[k] && scope.row[k].includes(i.value)">{{i.label}}&nbsp;</span>
                </span>
              </span>
            </span>
            <span v-else-if="s.type === 'string' && s.enum && s.enum.length">
              <span v-if="s.enumGroups && s.enumGroups.length">
                <span v-for="(g, i) in s.enumGroups" :key="i">
                  <span v-if="scope.row[g.assocEnum.property]===g.assocEnum.value">
                    <span v-for="(e, v) in s.enum" :key="v">
                      <span v-if="e.group===g.id && scope.row[k] === e.value">{{e.label}}</span>
                    </span>
                  </span>
                </span>
              </span>
              <span v-else>
                <span v-for="(i, v) in s.enum" :key="v">
                  <span v-if="scope.row[k] === i.value">{{i.label}}</span>
                </span>
              </span>
            </span>
            <span v-else>{{ scope.row[k] }}</span>
          </template>
        </el-table-column>
        <el-table-column fixed="right" width="210" label="操作" v-if="hasTableDocOperations">
          <template slot-scope="scope">
            <el-button v-if="docOperations.edit" size="mini" @click="editDocument(scope.row)">修改</el-button>
            <el-button v-if="docOperations.remove" size="mini" @click="removeDocument(scope.row)">删除</el-button>
            <el-button type="success" plain v-for="p in computedPlugins" :key="p.name" size="mini" @click="handlePlugins(p, scope.row)">{{p.title}}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <tms-flex class="tmw-pagination">
        <div class="tmw-pagination__text">已选中 {{totalByChecked}} 条数据</div>
        <el-pagination background @size-change="handleSize" @current-change="handleCurrentPage" :current-page.sync="page.at" :page-sizes="[10, 25, 50, 100]" :page-size="page.size" layout="total, sizes, prev, pager, next" :total="page.total"></el-pagination>
      </tms-flex>
    </template>
    <template v-slot:right>
      <tms-flex direction="column" align-items="flex-start">
        <div>
          <el-button v-if="docOperations.create" @click="createDocument">添加数据</el-button>
        </div>
        <el-upload v-if="docOperations.import" action="#" :show-file-list="false" :http-request="importDocument">
          <el-button>导入数据</el-button>
        </el-upload>
        <el-dropdown v-if="docOperations.editMany" @command="editManyDocument">
          <el-button>批量修改<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <el-dropdown v-if="docOperations.removeMany" @command="removeManyDocument">
          <el-button>批量删除<i class="el-icon-arrow-down el-icon--right"></i>
          </el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <el-dropdown v-if="docOperations.copyMany" @command="copyManyDocument">
          <el-button>批量复制<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <el-dropdown v-if="docOperations.transferMany" @command="transferManyDocument">
          <el-button>批量迁移<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <el-dropdown v-if="docOperations.export" @command="exportDocument">
          <el-button>导出数据<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <div v-for="p in computedPluginData" :key="p.name">
          <el-button v-if="p.transData==='nothing'" type="success" plain @click="handlePlugins(p)">{{p.title}}</el-button>
          <el-dropdown v-else>
            <el-button type="success" plain>{{p.title}}<i class="el-icon-arrow-down el-icon--right"></i></el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugins(p, 'all')" :disabled="totalByAll==0">按全部({{totalByAll}})</el-button>
              </el-dropdown-item>
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugins(p, 'filter')" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-button>
              </el-dropdown-item>
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugins(p, 'checked')" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-button>
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </tms-flex>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import store from '../../ue_mongo/src/store'
import { Frame, Flex } from 'tms-vue-ui'
import {
  Table,
  TableColumn,
  Button,
  Checkbox,
  CheckboxGroup,
  Upload,
  Pagination,
  Message,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  MessageBox,
  Tree,
  Badge
} from 'element-ui'

import DocEditor from './DocEditor.vue'
import SelectCondition from './SelectCondition.vue'
import ColumnValueEditor from '../../ue_mongo/src/components/ColumnValueEditor.vue'
import { createAndMount as createAndMountSelectColl } from './widgets/DialogSelectCollection.vue'
import createDbApi from '../../ue_mongo/src/apis/database'
import createClApi from '../../ue_mongo/src/apis/collection'
import createDocApi from '../../ue_mongo/src/apis/document'
import createSchemaApi from '../../ue_mongo/src/apis/schema'
import createPluginApi from '../../ue_mongo/src/apis/plugin'

const { VUE_APP_SCHEMA_TAGS, VUE_APP_SCHEMA_DEFAULT_TAGS } = process.env
const collection = {}

const componentOptions = {
  components: {
    'el-table': Table,
    'el-table-column': TableColumn,
    'el-button': Button,
    'el-checkbox': Checkbox,
    'el-checkbox-group': CheckboxGroup,
    'el-upload': Upload,
    'el-pagination': Pagination,
    'el-dropdown': Dropdown,
    'el-dropdown-menu': DropdownMenu,
    'el-dropdown-item': DropdownItem,
    'el-tree': Tree,
    'el-badge': Badge
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
      frameDisplay: {
        header: false,
        footer: false,
        right: true,
        left: false
      },
      docOperations: {
        create: true,
        edit: true,
        remove: true,
        editMany: true,
        removeMany: true,
        transferMany: true,
        import: true,
        export: true,
        copyMany: true
      },
      tableHeight: 0,
      filter: {},
      page: {
        at: 1,
        size: 100,
        total: 0
      },
      selectedDocuments: [],
      properties: {},
      dialogPage: {
        at: 1,
        size: 100
      },
      pluginData: [],
      groupData: [],
      defaultProps: {
        children: 'children',
        label: 'value'
      }
    }
  },
  computed: {
    hasTableDocOperations() {
      return this.docOperations.edit || this.docOperations.remove
    },
    documents() {
      return store.state.documents
    },
    conditions() {
      return store.state.conditions
    },
    totalByAll() {
      return Object.keys(this.filter).length ? 0 : this.page.total
    },
    totalByFilter() {
      return Object.keys(this.filter).length ? this.page.total : 0
    },
    totalByChecked() {
      return this.selectedDocuments.length
    },
    computedPlugins() {
      if (!this.pluginData.length) return []
      return this.pluginData.filter(
        item => item.transData && item.transData === 'one'
      )
    },
    computedPluginData() {
      if (!this.pluginData.length) return []
      return this.pluginData.filter(
        item => !item.transData || item.transData !== 'one'
      )
    }
  },
  created() {
    this.tableHeight = window.innerHeight * 0.8
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
      return createDocApi(this.TmsAxios(this.tmsAxiosName)).byColumnVal(
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
    handleFilterByColumn(obj, columnName) {
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
      // 允许分组
      if (this.properties[columnName]['groupable'] !== false) {
        this.listByColumn(
          columnName,
          this.conditions.length ? filter : undefined,
          this.conditions.length ? orderBy : undefined,
          this.dialogPage.at,
          this.dialogPage.size
        ).then(columnResult => {
          select.condition.selectResult = columnResult
          select.condition.multipleSelection = columnResult
          // 暂时先用延迟解决，该方法还需改进
          setTimeout(() => {
            select.toggleSelection(columnResult)
          }, 0)
        })
      }
      select
        .open(
          columnName,
          this.dialogPage,
          this.handleCondition(),
          this.listByColumn,
          this.properties[columnName]
        )
        .then(rsl => {
          const { condition, isClear, isCheckBtn } = rsl
          store.commit('conditionAddColumn', { condition })
          if (isClear) store.commit('conditionDelColumn', { condition })
          let objPro = this.properties
          if (isCheckBtn) store.commit('conditionDelBtn', { columnName })
          Object.keys(objPro).map((ele, index) => {
            const attrs = document.querySelectorAll('#table thead img')[index]
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
    selectGroupNode(data) {
      let groupBy = collection.custom.docFilters[0].data
      let parents = []
      for (let p = data; p; p = p.parent) parents.unshift(p.value)
      let filter = parents.reduce((f, p, index) => {
        f[groupBy[index]] = p
        return f
      }, {})
      this.listDocument(filter)
    },
    resetSelectedGroupNode() {
      let selected = this.$refs.groupNodeTree.getCurrentKey()
      if (selected) {
        this.$refs.groupNodeTree.setCurrentKey()
        this.listDocument()
      }
    },
    handleSelectDocument(rows) {
      this.selectedDocuments = rows
    },
    createDocument() {
      let editor = new Vue(DocEditor)
      editor
        .open(this.tmsAxiosName, this.bucketName, this.dbName, collection)
        .then(() => {
          this.listDocument()
        })
    },
    editDocument(doc) {
      let editor = new Vue(DocEditor)
      editor
        .open(this.tmsAxiosName, this.bucketName, this.dbName, collection, doc)
        .then(() => {
          this.listDocument()
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
        .catch(() => {})
    },
    fnSetReqParam(command) {
      let param = {}
      if (command === 'all') {
        param.filter = 'ALL'
      } else if (command === 'filter') {
        param.filter = this.handleCondition().filter
        this.filter = param.filter
      } else if (command === 'checked') {
        let ids = this.selectedDocuments.map(document => document._id)
        param.docIds = ids
      }
      return { param }
    },
    fnHandleResResult(result, isMultiple) {
      const realAt = Math.ceil((this.page.total - result.n) / this.page.size)
      this.page.at = realAt > this.page.at ? this.page.at : realAt ? realAt : 1
      this.listDocument()
      if (isMultiple) {
        this.$refs.documentsTable.clearSelection()
        this.selectedDocuments = []
      }
    },
    editManyDocument(command) {
      let { param } = this.fnSetReqParam(command),
        editor
      editor = new Vue(ColumnValueEditor)
      editor.open(collection).then(columns => {
        Object.assign(param, { columns })
        createDocApi(this.TmsAxios(this.tmsAxiosName))
          .batchUpdate(this.bucketName, this.dbName, collection.name, param)
          .then(result => {
            Message.success({
              message: '已成功修改' + result.modifiedCount + '条'
            })
            this.listDocument()
          })
      })
    },
    fnMoveDocument(dbName, clName, param, pTotal, aMTotal, aMPTotal) {
      let msg = Message.info({ message: '开始迁移数据...', duration: 0 }),
        _this = this
      async function fnmove(dbName, clName, param, pTotal, aMTotal, aMPTotal) {
        let result = await createDocApi(_this.TmsAxios(_this.tmsAxiosName))
          .move(
            _this.bucketName,
            _this.dbName,
            _this.clName,
            dbName,
            clName,
            param,
            pTotal,
            aMTotal,
            aMPTotal
          )
          .catch(() => msg.close())
        if (result) {
          let {
            planTotal,
            alreadyMoveTotal,
            alreadyMovePassTotal,
            alreadyMoveFailTotal,
            spareTotal
          } = result
          msg.message = '正在迁移数据...'
          if (spareTotal <= 0) {
            msg.message =
              '成功迁移' +
              alreadyMovePassTotal +
              '条，失败' +
              alreadyMoveFailTotal +
              '条'
            setTimeout(() => msg.close(), 1000)
            return result
          }
          return fnmove(
            dbName,
            clName,
            param,
            planTotal,
            alreadyMoveTotal,
            alreadyMovePassTotal
          )
        }
      }
      return fnmove(dbName, clName, param, pTotal, aMTotal, aMPTotal)
    },
    removeManyDocument(command) {
      let { param } = this.fnSetReqParam(command)
      MessageBox({
        title: '提示',
        message: '确定删除这些数据？',
        confirmButtonText: '确定',
        type: 'warning'
      })
        .then(() => {
          createDocApi(this.TmsAxios(this.tmsAxiosName))
            .batchRemove(this.bucketName, this.dbName, this.clName, param)
            .then(result => {
              Message.success({ message: `已成功删除${result.deletedCount}条` })
              this.fnHandleResResult(result, true)
            })
        })
        .catch(() => {})
    },
    copyManyDocument(command) {
      import('./widgets/DialogSelectCollection.vue').then(Module => {
        let { bucketName, tmsAxiosName } = this
        let propsData = {
          bucketName,
          tmsAxiosName
        }
        const vm = Module.createAndMount(Vue, propsData, {
          createDbApi,
          createClApi
        })
        vm.$on('confirm', ({ db, cl }) => {
          let { param } = this.fnSetReqParam(command)
          createDocApi(this.TmsAxios(this.tmsAxiosName))
            .copyMany(this.bucketName, this.dbName, this.clName, db, cl, param)
            .then(result => {
              Message.success({ message: '已成功复制' + result + '条' })
            })
        })
      })
    },
    transferManyDocument(command) {
      let { param } = this.fnSetReqParam(command)

      let { bucketName, tmsAxiosName } = this
      let propsData = {
        bucketName,
        tmsAxiosName
      }
      const vm = createAndMountSelectColl(Vue, propsData, {
        createDbApi,
        createClApi
      })
      vm.$on('confirm', ({ db: dbName, cl: clName }) => {
        if (command === 'checked') {
          this.fnMoveDocument(dbName, clName, param, 0, 0, 0).then(result => {
            this.fnHandleResResult({ n: result.alreadyMovePassTotal }, true)
          })
        } else {
          this.fnMoveDocument(dbName, clName, param, 0, 0, 0).then(() => {
            this.page.at = 1
            this.listDocument()
          })
        }
      })
    },
    importDocument(data) {
      let formData = new FormData()
      let msg = Message({
        type: 'info',
        message: '正在导入数据...',
        duration: 0
      })
      formData.append('file', data.file)
      createDocApi(this.TmsAxios(this.tmsAxiosName))
        .import(this.bucketName, this.dbName, this.clName, formData)
        .then(result => {
          if (result.importAll) {
            msg.type = 'success'
            setTimeout(() => msg.close(), 1000)
          } else {
            msg.showClose = true
          }
          msg.message = result.message
          this.listDocument()
        })
        .catch(() => {
          setTimeout(() => msg.close(), 1000)
        })
    },
    exportDocument(command) {
      let { param } = this.fnSetReqParam(command)
      Object.assign(param, { columns: this.properties })
      createDocApi(this.TmsAxios(this.tmsAxiosName))
        .export(this.bucketName, this.dbName, this.clName, param)
        .then(result => {
          const access_token = sessionStorage.getItem('access_token')
          window.open(`${result}?access_token=${access_token}`)
        })
    },
    handleDownload(file) {
      const access_token = sessionStorage.getItem('access_token')
      window.open(`${file.url}?access_token=${access_token}`)
    },
    handlePlugins(plugin, conditionType) {
      let postBody
      if (plugin.transData && plugin.transData === 'one') {
        postBody = { docIds: [conditionType._id] }
      } else {
        postBody = conditionType
          ? this.fnSetReqParam(conditionType).param
          : null
      }
      new Promise(resolve => {
        let { beforeWidget } = plugin
        if (beforeWidget && beforeWidget.name === 'DialogSelectDocument') {
          import('./widgets/DialogSelectDocument.vue').then(Module => {
            let { bucketName, dbName, clName, tmsAxiosName } = this
            new Promise(resolve => {
              if (beforeWidget.remoteWidgetOptions === true)
                return createPluginApi(this.TmsAxios(this.tmsAxiosName))
                  .remoteWidgetOptions(
                    bucketName,
                    dbName,
                    clName,
                    plugin.name,
                    postBody
                  )
                  .then(result => {
                    resolve(result)
                  })
              else return {}
            }).then(preCondition => {
              let propsData = {
                bucketName,
                tmsAxiosName
              }
              // 插件设置的固定条件
              if (preCondition && typeof preCondition === 'object') {
                let { db, cl, filter, orderby, schema } = preCondition
                propsData.fixedDbName = db
                propsData.fixedClName = cl
                propsData.fixedDocumentFilter = filter
                propsData.fixedDocumentOrderby = orderby
                propsData.fixedSchema = schema
              }
              const vm = Module.createAndMount(Vue, propsData, {
                createDbApi,
                createClApi,
                createDocApi
              })
              vm.$on('confirm', result => {
                resolve(result)
              })
            })
          })
        } else if (beforeWidget && beforeWidget.name === 'DialogSchemaForm') {
          import('./widgets/DialogSchemaForm.vue').then(Module => {
            let { bucketName, dbName, clName, tmsAxiosName } = this
            new Promise(resolve => {
              if (beforeWidget.remoteWidgetOptions === true)
                return createPluginApi(this.TmsAxios(this.tmsAxiosName))
                  .remoteWidgetOptions(
                    bucketName,
                    dbName,
                    clName,
                    plugin.name,
                    postBody
                  )
                  .then(result => {
                    resolve(result)
                  })
              else return {}
            }).then(preCondition => {
              let propsData = {}
              if (preCondition && typeof preCondition === 'object') {
                let { schema } = preCondition
                propsData.schema = schema
                propsData.tmsAxiosName = tmsAxiosName
              }
              const vm = Module.createAndMount(Vue, propsData, {
                createDocApi
              })
              vm.$on('confirm', result => {
                resolve(result)
              })
            })
          })
        } else if (
          beforeWidget &&
          beforeWidget.name === 'DialogSelectCollection'
        ) {
          let { bucketName, tmsAxiosName, dbName, clName } = this
          new Promise(resolve => {
            if (beforeWidget.remoteWidgetOptions === true)
              return createPluginApi(this.TmsAxios(this.tmsAxiosName))
                .remoteWidgetOptions(bucketName, dbName, clName, plugin.name)
                .then(result => {
                  resolve(result)
                })
            else return {}
          }).then(preCondition => {
            let propsData = {
              bucketName,
              tmsAxiosName
            }
            // 插件设置的固定条件
            if (preCondition && typeof preCondition === 'object') {
              let { db, cl } = preCondition
              propsData.fixedDbName = db
              propsData.fixedClName = cl
            }
            const vm = createAndMountSelectColl(Vue, propsData, {
              createDbApi,
              createClApi
            })
            vm.$on('confirm', ({ db: dbName, cl: clName }) =>
              resolve({ db: dbName, cl: clName })
            )
          })
        } else if (beforeWidget && beforeWidget.name === 'DialogMessagebox') {
          if (beforeWidget.preCondition) {
            let { msgbox, confirm, cancel } = beforeWidget.preCondition
            let { confirmMsg, confirmText, cancelText } = msgbox
            MessageBox.confirm(confirmMsg, '提示', {
              distinguishCancelAndClose: true,
              confirmButtonText: confirmText || '确定',
              cancelButtonText: cancelText || '取消'
            })
              .then(() => resolve(confirm))
              .catch(action => {
                if (action === 'close') return {}
                resolve(cancel)
              })
          } else return {}
        } else resolve()
      }).then(beforeResult => {
        if (beforeResult) {
          if (!postBody) postBody = {}
          postBody.widget = beforeResult
        }
        let queryParams = {
          db: this.dbName, // 参数名改为db
          cl: this.clName, // 参数名改为cl
          plugin: plugin.name
          // name: plugin.name,
          // type: plugin.type, // 这个参数应该去掉，插件自己知道自己的类型
        }
        createPluginApi(this.TmsAxios(this.tmsAxiosName))
          .execute(queryParams, postBody)
          .then(result => {
            if (typeof result === 'string') {
              Message.success({
                message: result,
                showClose: true
              })
              this.listDocument()
            } else if (
              result &&
              typeof result === 'object' &&
              result.type === 'documents'
            ) {
              /**返回操作结果——数据 */
              let nInserted = 0,
                nModified = 0,
                nRemoved = 0
              let { inserted, modified, removed } = result
              /**在当前文档列表中移除删除的记录 */
              if (Array.isArray(removed) && (nRemoved = removed.length)) {
                let documents = this.documents.filter(
                  doc => !removed.includes(doc._id)
                )
                store.commit('documents', { documents })
              }
              /**在当前文档列表中更新修改的记录 */
              if (Array.isArray(modified) && (nModified = modified.length)) {
                let map = modified.reduce((m, doc) => {
                  if (doc._id && typeof doc._id === 'string') m[doc._id] = doc
                  return m
                }, {})
                this.documents.forEach(doc => {
                  let newDoc = map[doc._id]
                  if (newDoc) Object.assign(doc, newDoc)
                  store.commit('updateDocument', { document: doc })
                })
              }
              /**在当前文档列表中添加插入的记录 */
              if (Array.isArray(inserted) && (nInserted = inserted.length)) {
                inserted.forEach(newDoc => {
                  if (newDoc._id && typeof newDoc._id === 'string')
                    this.documents.unshift(newDoc)
                })
              }
              let msg = `插件[${plugin.title}]执行完毕，添加[${parseInt(
                nInserted
              ) || 0}]条，修改[${parseInt(nModified) || 0}]条，删除[${parseInt(
                nRemoved
              ) || 0}]条记录。`
              Message.success({ message: msg })
            } else if (
              result &&
              typeof result === 'object' &&
              result.type === 'numbers'
            ) {
              /**返回操作结果——数量 */
              let { nInserted, nModified, nRemoved } = result
              let message = `插件[${plugin.title}]执行完毕，添加[${parseInt(
                nInserted
              ) || 0}]条，修改[${parseInt(nModified) || 0}]条，删除[${parseInt(
                nRemoved
              ) || 0}]条记录。`
              MessageBox.confirm(message, '提示', {
                confirmButtonText: '关闭',
                cancelButtonText: '刷新数据',
                showClose: false
              }).catch(() => {
                this.listDocument()
              })
            } else {
              Message.success({
                message: `插件[${plugin.title}]执行完毕。`,
                showClose: true
              })
              this.listDocument()
            }
          })
      })
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
    listDocument(filter2) {
      const rule = this.handleCondition()
      const { orderBy, filter } = rule
      this.filter = Object.assign({}, filter, filter2)
      createDocApi(this.TmsAxios(this.tmsAxiosName))
        .list(
          this.bucketName,
          this.dbName,
          this.clName,
          this.page,
          this.filter,
          orderBy
        )
        .then(result => {
          const documents = result.docs
          store.commit('documents', { documents })
          this.page.total = result.total
        })
    },
    groupDocument() {
      const groupBy = collection.custom.docFilters[0].data
      createDocApi(this.TmsAxios(this.tmsAxiosName))
        .group(this.bucketName, this.dbName, this.clName, groupBy)
        .then(groups => {
          const travel = (n, p) => {
            if (n.children && n.children.length) {
              n.children.forEach(c => travel(c, n))
            } else n.parent = p
          }
          groups.forEach(g => travel(g))
          this.groupData = groups
        })
    },
    getSchemasByTags(data) {
      let temp = {}
      const arrPromise = data.map((item, index) =>
        createSchemaApi(this.TmsAxios(this.tmsAxiosName)).listByTag(
          this.bucketName,
          data[index]
        )
      )
      return Promise.all(arrPromise).then(res => {
        res.forEach(schemas => {
          schemas.forEach(schema => {
            temp = { ...temp, ...schema.body.properties }
          })
        })
        return temp
      })
    },
    async handleProperty() {
      let tags = VUE_APP_SCHEMA_TAGS
        ? VUE_APP_SCHEMA_TAGS.split(',')
        : collection.schema_tags
      let default_tags = VUE_APP_SCHEMA_DEFAULT_TAGS
        ? VUE_APP_SCHEMA_DEFAULT_TAGS.split(',')
        : collection.schema_default_tags
      let {
        schema: {
          body: { properties }
        }
      } = collection
      let temp = {}

      if (default_tags && default_tags.length) {
        await this.getSchemasByTags(default_tags).then(res => (temp = res))
      } else if (tags && tags.length) {
        await this.getSchemasByTags(tags).then(res => (temp = res))
      } else if (
        properties &&
        Object.prototype.toString.call(properties).toLowerCase() ==
          '[object object]'
      ) {
        Object.assign(temp, collection.schema.body.properties)
      }

      if (Object.keys(temp).length === 0) temp._id = { title: 'id' }
      this.properties = Object.freeze(temp)
    }
  },
  mounted() {
    Promise.all([
      createClApi(this.TmsAxios(this.tmsAxiosName)).byName(
        this.bucketName,
        this.dbName,
        this.clName
      ),
      createPluginApi(this.TmsAxios(this.tmsAxiosName)).getPlugins(
        this.bucketName,
        this.dbName,
        this.clName
      )
    ]).then(async res => {
      Object.assign(collection, res[0])
      this.pluginData = res[1]
      await this.handleProperty()
      /**集合定制功能设置 */
      const { custom } = collection
      if (custom) {
        const { docOperations: docOps, docFilters } = custom
        /**支持的文档操作 */
        if (docOps && typeof docOps === 'object') {
          const { docOperations } = this
          if (docOps.create === false) docOperations.create = false
          if (docOps.edit === false) docOperations.edit = false
          if (docOps.remove === false) docOperations.remove = false
          if (docOps.editMany === false) docOperations.editMany = false
          if (docOps.removeMany === false) docOperations.removeMany = false
          if (docOps.transferMany === false) docOperations.transferMany = false
          if (docOps.import === false) docOperations.import = false
          if (docOps.export === false) docOperations.export = false
          if (docOps.copyMany === false) docOperations.copyMany = false
        }
        /**文档筛选 */
        if (docFilters && docFilters.length) {
          this.frameDisplay.left = true
          this.groupDocument()
        }
      }
      this.conditionReset()
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

  Vue.use(Flex).use(Frame)

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
  .el-button + .el-button {
    margin-left: 2px;
  }
}
</style>
