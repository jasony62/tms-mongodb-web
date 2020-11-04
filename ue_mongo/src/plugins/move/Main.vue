<template>
  <tms-frame ref="plugin" :display="{ header: true, footer: true, right: true }" :leftWidth="'20%'">
    <template v-slot:header>
      <el-button type="text" @click="closeDialog">返回</el-button>
    </template>
    <template v-slot:center>
      <el-table :data="rules" stripe ref="multipleTable" style="width: 100%">
        <el-table-column v-for="(s, k) in schemas" :key="k" :prop="k" :label="s.title"></el-table-column>
        <el-table-column fixed="right" label="操作" width="180">
          <template slot-scope="scope">
            <el-button size="mini" @click="details(scope.row)" v-if="scope.row.data">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
    <template v-slot:right>
      <tms-flex direction="column">
        <div v-if="!failed.length">
          <el-button @click="moveDocument">开始迁移</el-button>
        </div>
      </tms-flex>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { Frame, Flex } from 'tms-vue-ui'
Vue.use(Frame)
  .use(Flex)
import { Table, TableColumn, Input, Row, Col, Button, Message } from 'element-ui'
Vue.use(Table)
  .use(TableColumn)
  .use(Input)
  .use(Row)
  .use(Col)
  .use(Button)
  
import DomainEditor from '../../components/DomainEditor'
import CollectionDialog from '../../components/CollectionDialog.vue'
import createCollectionApi from '../../apis/collection'
import api from './index'

export default {
  name: 'Main',
  data() {
    return {
      dialogVisible: false,
      failed: [],
      rules: [],
      schemas: {},
      collection: {
        type: Object,
        default: function() {
          return { name: '', title: '', description: '', schema_id: '' }
        }
      }
    }
  },
  methods: {
    fnGetTelIdsOfEachRule(rule) {
      const telIds = rule.data.map(data => data._id)
      return telIds
    },
    moveDocument() {
      let _this, confirm, config
      _this = this
      confirm = new Vue(DomainEditor)
      config = { title: '迁移到' }
      confirm.open(config).then(function(fields) {
        const { dbName, clName } = fields
        async function batch(rules) {
          for (let rule of rules) {
            let args = [{
              ruleId: rule._id,
              docIds: _this.fnGetTelIdsOfEachRule(rule)
            }]
            await createCollectionApi(this.TmsAxios('mongodb-api')).movebyRule(dbName, clName, _this.dbName, _this.clName, _this.ruleDbName, _this.ruleClName, _this.transfroms, args).then(result => {          
              rule.import_status = result[0].msg
            })
          }
          return await rules
        }
        batch(_this.rules).then(function(rules) {
          _this.rules = rules
          Message.success({ message: "迁移成功" })
        })
      })
    },
    details(row) {
      let detail = new Vue(CollectionDialog)
      detail.open(row.data, this.collection).then(tels => {
        row.data = tels
      })
    },
    closeDialog() {
      document.body.removeChild(this.$el)
    },
    showDialog(db, cl, ruleDb, ruleCl, transform) {
      this.dialogVisible = true
      this.dbName = db
      this.clName = cl
      this.ruleDbName = ruleDb
      this.ruleClName = ruleCl
      this.transform = transform
      this.$mount()
      document.body.appendChild(this.$el)
    }
  },
  mounted() {
    this.$refs.plugin.$el.style.zIndex = parseInt(document.body.lastChild.style.zIndex) + 1
    api.list(this.dbName, this.clName, this.ruleDbName, this.ruleClName)
    .then(data => { 
      this.schemas = data.schemas
      this.failed = data.failed
      this.rules = this.failed.concat(data.passed) 
    }).then(() => {
			createCollectionApi(this.TmsAxios('mongodb-api'))
				.byName(this.dbName, this.clName).then(collection => {
					this.collection = collection
				})
    })
  }
}
</script>

<style lang="less" src="../../assets/css/common.less"></style>