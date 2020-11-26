<template>
  <tms-frame class="tmw-document" :display="{ header: false, footer: false, right: true }" :leftWidth="'20%'">
    <template v-slot:center>
      <el-table id="tables" :data="documents" stripe ref="multipleTable" :max-height="tableHeight" @selection-change="handleSelectDocument">
        <el-table-column fixed="left" type="selection" width="55"></el-table-column>
        <el-table-column v-for="(s, k) in properties" :key="k" :prop="k">
          <template slot="header">
            <i v-if="s.description" class="el-icon-info" :title="s.description"></i>
            <i v-if="s.required" style="color:red">*</i>
            <span> {{s.title}} </span>
            <img src="../assets/icon_filter.png" class="icon_filter" @click="handleSelect(s, k)">
          </template>
          <template slot-scope="scope">
            <span v-if="s.type==='boolean'">{{ scope.row[k] ? '是' : '否' }}</span>
            <span v-else-if="s.type==='array'&& s.items && s.items.format==='file'">
              <span v-for="(i, v) in scope.row[k]" :key="v">
                <a href="#" @click="handleDownload(i)">{{i.name}}</a><br />
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
        <el-table-column fixed="right" label="操作" width="150" v-if="documents.length">
          <template slot-scope="scope">
            <el-button size="mini" @click="editDocument(scope.row)">修改</el-button>
            <el-button size="mini" @click="removeDocument(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <tms-flex class="tmw-pagination">
        <span class="tmw-pagination__text">已选中 {{totalByChecked}} 条数据</span>
        <el-pagination background @size-change="handleSize" @current-change="handleCurrentPage" :current-page.sync="page.at" :page-sizes="[10, 25, 50, 100]" :page-size="page.size" layout="total, sizes, prev, pager, next" :total="page.total">
        </el-pagination>
      </tms-flex>
    </template>
    <template v-slot:right>
      <tms-flex direction="column" align-items="flex-start">
        <div>
          <el-button @click="createDocument">添加数据</el-button>
        </div>
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
        <el-dropdown @command="exportDocument">
          <el-button>导出数据<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <hr />
        <el-dropdown @command="batchRemoveDocument" placement="bottom-start">
          <el-button>批量删除<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <hr />
        <el-checkbox-group v-model="moveCheckList" v-if="plugins.document.transforms&&plugins.document.transforms.move">
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
        <hr />
        <div v-for="s in plugins.document.submits" :key="s.id">
          <el-checkbox-group v-model="s.checkList" v-if="plugins.document.transforms&&plugins.document.transforms[s.id]">
            <el-checkbox v-for="(t, k) in plugins.document.transforms[s.id]" :label="t.name" :key="k">{{t.label}}</el-checkbox>
          </el-checkbox-group>
          <el-button @click="handlePlugin(s, null)" v-if="!s.batch">{{s.name}}</el-button>
          <el-dropdown v-if="s.batch">
            <el-button>{{s.name}}<i class="el-icon-arrow-down el-icon--right"></i></el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugin(s, 'all')" :disabled="totalByAll==0">按全部({{totalByAll}})</el-button>
              </el-dropdown-item>
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugin(s, 'filter')" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-button>
              </el-dropdown-item>
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugin(s, 'checked')" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-button>
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
          <hr v-if="plugins.document.transforms&&plugins.document.transforms[s.id]" />
        </div>
        <div v-for="(s, i) in computedPluginData" :key="i">
          <el-button @click="handlePlugins(s, null)" v-if="!s[2].batch">{{s[2].name}}</el-button>
          <el-dropdown v-if="s[2].batch">
            <el-button type="success" plain>{{s[2].name}}<i class="el-icon-arrow-down el-icon--right"></i></el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugins(s, 'all')" :disabled="totalByAll==0">按全部({{totalByAll}})</el-button>
              </el-dropdown-item>
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugins(s, 'filter')" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-button>
              </el-dropdown-item>
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugins(s, 'checked')" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-button>
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
  MessageBox
} from 'element-ui'

import DocEditor from './DocEditor.vue'
import SelectCondition from './SelectCondition.vue'
import ColumnValueEditor from '../../ue_mongo/src/components/ColumnValueEditor.vue'
import DomainEditor from '../../ue_mongo/src/components/DomainEditor.vue'
import MoveByRulePlugin from '../../ue_mongo/src/plugins/move/Main.vue'
import createCollectionApi from '../../ue_mongo/src/apis/collection'
import createDocApi from '../../ue_mongo/src/apis/document'
import createSchemaApi from '../../ue_mongo/src/apis/schema'
import createPluginApi from '../../ue_mongo/src/apis/plugin'
import apiPlugins from '../../ue_mongo/src/plugins'

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
    'el-dropdown-item': DropdownItem
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
      tableHeight: 0,
      moveCheckList: [],
      filter: {},
      page: {
        at: 1,
        size: 100,
        total: 0
      },
      multipleDocuments: [],
      properties: {},
      plugins: { document: { submits: [], transforms: {} } },
      dialogPage: {
        at: 1,
        size: 100
      },
      pluginData: []
    }
  },
  computed: {
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
      return this.multipleDocuments.length
    },
    computedPluginData() {
      const currentAuth = this.getCurrentAuth() || '*'
      return this.pluginData.filter(
        item =>
          item[2].auth &&
          (item[2].auth.includes('*') || item[2].auth.includes(currentAuth))
      )
    }
  },
  created() {
    this.tableHeight = window.innerHeight * 0.8
  },
  methods: {
    getCurrentAuth() {
      return '*'
    },
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
      return _obj.map(ele => ele.rule).reduce((prev, curr) => {
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
            const attrs = document.querySelectorAll('#tables thead img')[index]
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
    fnGetMultipleIds() {
      let ids = this.multipleDocuments.map(document => document._id)
      return ids
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
        .catch(() => {})
    },
    fnSetReqParam(command, checkList) {
      let param, transforms
      param = {}
      transforms = checkList && checkList.join(',')
      switch (command) {
        case 'all':
          param.filter = 'ALL'
          break
        case 'filter':
          param.filter = this.handleCondition().filter
          this.filter = param.filter
          break
        case 'checked':
          param.docIds = this.fnGetMultipleIds()
      }
      return { param: param, transforms: transforms }
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
    batchEditDocument(command) {
      let { param } = this.fnSetReqParam(command),
        editor
      editor = new Vue(ColumnValueEditor)
      editor.open(collection).then(columns => {
        Object.assign(param, { columns })
        createDocApi(this.TmsAxios(this.tmsAxiosName))
          .batchUpdate(this.bucketName, this.dbName, collection.name, param)
          .then(result => {
            Message.success({ message: '已成功修改' + result.n + '条' })
            this.listDocument()
          })
      })
    },
    fnMoveDocument(
      dbName,
      clName,
      transforms,
      param,
      pTotal,
      aMTotal,
      aMPTotal
    ) {
      let msg = Message.info({ message: '开始迁移数据...', duration: 0 }),
        _this = this
      async function fnmove(
        dbName,
        clName,
        transforms,
        param,
        pTotal,
        aMTotal,
        aMPTotal
      ) {
        let result = await createDocApi(_this.TmsAxios(_this.tmsAxiosName))
          .move(
            _this.bucketName,
            _this.dbName,
            _this.clName,
            dbName,
            clName,
            transforms,
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
            transforms,
            param,
            planTotal,
            alreadyMoveTotal,
            alreadyMovePassTotal
          )
        }
      }
      return fnmove(
        dbName,
        clName,
        transforms,
        param,
        pTotal,
        aMTotal,
        aMPTotal
      )
    },
    batchRemoveDocument(command) {
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
              Message.success({ message: '已成功删除' + result.n + '条' })
              this.fnHandleResResult(result, true)
            })
        })
        .catch(() => {})
    },
    batchMoveDocument(command) {
      let { param, transforms } = this.fnSetReqParam(
          command,
          this.moveCheckList
        ),
        confirm,
        config
      confirm = new Vue(DomainEditor)
      config = { title: '迁移到' }
      confirm.open(this.tmsAxiosName, this.bucketName, config).then(fields => {
        const { dbName, clName } = fields
        if (command === 'checked') {
          this.fnMoveDocument(dbName, clName, transforms, param, 0, 0, 0).then(
            result => {
              this.fnHandleResResult({ n: result.alreadyMovePassTotal }, true)
            }
          )
        } else {
          this.fnMoveDocument(dbName, clName, transforms, param, 0, 0, 0).then(
            () => {
              this.page.at = 1
              this.listDocument()
            }
          )
        }
      })
    },
    importDocument(data) {
      let formData = new FormData()
      const msg = Message.info({ message: '正在导入数据...', duration: 0 })
      formData.append('file', data.file)
      createDocApi(this.TmsAxios(this.tmsAxiosName))
        .import(this.bucketName, this.dbName, this.clName, formData)
        .then(() => {
          this.listDocument()
          setTimeout(() => msg.close(), 1000)
        })
        .catch(() => {
          setTimeout(() => msg.close(), 1000)
        })
    },
    exportDocument(command) {
      let { param } = this.fnSetReqParam(command)
      createDocApi(this.TmsAxios(this.tmsAxiosName))
        .export(this.bucketName, this.dbName, this.clName, param)
        .then(result => {
          const access_token = sessionStorage.getItem('access_token')
          window.open(
            `${
              process.env.VUE_APP_BACK_API_FS
            }${result}?access_token=${access_token}`
          )
        })
    },
    handleDownload(file) {
      const access_token = sessionStorage.getItem('access_token')
      window.open(
        `${process.env.VUE_APP_BACK_API_FS}${
          file.url
        }?access_token=${access_token}`
      )
    },
    handlePlugin(submit, type) {},
    handlePlugins(s, type) {
      const { param: postParams } = type
        ? this.fnSetReqParam(type)
        : { param: null }
      let getParams = {
        bucket: env.process.VUE_APP_PLUGIN_BUCKET,
        pluginCfg: s[0],
        db: this.dbName,
        clName: this.clName
      }
      if (!s[2].isConfirm) {
        return this.handlePluginsApi(s, getParams, postParams, 'defaultParams')
      }
    },
    async handlePluginsApi(s, getParams, postParams, mergeParams) {
      const toType = Object.prototype.toString
      const source =
        s[2][mergeParams] &&
        toType.call(s[2][mergeParams]) === '[object Object]'
          ? s[2][mergeParams]
          : {}

      Object.assign(getParams, source)

      await createPluginApi(this.TmsAxios(this.tmsAxiosName)).handlePlugin(
        postParams,
        getParams
      )
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
    listPlugin() {
      apiPlugins.plugin.list().then(plugins => {
        if (JSON.stringify(plugins) !== '{}') {
          if (plugins.document.transforms) {
            this.moveCheckList = plugins.document.transforms.move.map(
              option => option.name
            )
            plugins.document.submits.forEach(submit => {
              let transforms = plugins.document.transforms[submit.id]
              submit.checkList = transforms
                ? transforms.map(item => item.name)
                : []
            })
          }
          this.plugins = plugins
        }
      })
    },
    listDocument() {
      const rule = this.handleCondition()
      this.filter = rule.filter
      const { orderBy, filter } = rule
      createDocApi(this.TmsAxios(this.tmsAxiosName))
        .list(
          this.bucketName,
          this.dbName,
          this.clName,
          this.page,
          filter,
          orderBy
        )
        .then(result => {
          const documents = result.docs
          store.commit('documents', { documents })
          this.page.total = result.total
        })
    },
    getTaglist(data) {
      let temp = {}
      const arrPromise = data.map((item, index) =>
        createSchemaApi(this.TmsAxios(this.tmsAxiosName)).listByTag(
          this.bucketName,
          data[index]
        )
      )
      return Promise.all(arrPromise)
        .then(res => {
          res.forEach(schemas => {
            schemas.forEach(schema => {
              temp = { ...temp, ...schema.body.properties }
            })
          })
          return temp
        })
        .catch(err => {
          throw new Error(err)
        })
    },
    async handleProperty() {
      let tags =
        (process.env.VUE_APP_TAGS && process.env.VUE_APP_TAGS.split(',')) ||
        collection.tags
      let default_tag =
        (process.env.VUE_APP_DEFAULT_TAG &&
          process.env.VUE_APP_DEFAULT_TAG.split(',')) ||
        collection.default_tag
      let temp = {}

      if (default_tag && default_tag.length) {
        await this.getTaglist(default_tag).then(res => (temp = res))
      } else if (tags && tags.length) {
        await this.getTaglist(tags).then(res => (temp = res))
      } else {
        Object.assign(temp, collection.schema.body.properties)
      }
      this.properties = Object.freeze(temp)
    }
  },
  mounted() {
    Promise.all([
      this.$apis.collection.byName(this.bucketName, this.dbName, this.clName),
      this.$apis.plugin.getPlugins()
    ]).then(async res => {
      Object.assign(collection, res[0])
      this.pluginData = res[1]
      await this.handleProperty()
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
}
</style>
