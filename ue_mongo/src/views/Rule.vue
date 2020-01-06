<template>
  <tms-frame
    class="tmw-document"
    :display="{ header: true, footer: true, right: true }"
    :leftWidth="'20%'"
  >
    <template v-slot:header>
      <router-link :to="{
          name: 'collection',
          params: { clName }
        }">返回</router-link>
    </template>
    <template v-slot:center>
      <el-table 
        :data="rules" 
        stripe 
        ref="multipleTable" 
        style="width: 100%">
        <el-table-column
          v-for="(s, k) in schemas"
          :key="k"
          :prop="k"
          :label="s.title"
        ></el-table-column>
        <el-table-column fixed="right" label="操作" width="180">
          <template slot-scope="scope">
            <el-button size="mini" @click="details(scope.row)" v-if="scope.row.data">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
    <template v-slot:right>
      <tms-flex direction="column">
        <div v-if="!failed.length"><el-button @click="moveDocument">开始迁移</el-button></div>
      </tms-flex>      
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { Frame, Flex } from 'tms-vue-ui'
Vue.use(Frame)
Vue.use(Flex)
import { Table, TableColumn, Input, Row, Col, Button, Message } from 'element-ui'
Vue.use(Table)
  .use(TableColumn)
  .use(Input)
  .use(Row)
  .use(Col)
  .use(Button)
Vue.prototype.$message = Message

import DomainEditor from '../components/DomainEditor.vue'
import CollectionDialog from '../components/CollectionDialog.vue'
import { doc as apiDoc, collection as apiCol } from '../apis'

export default {
  name: 'Rule',
  props: ['dbName', 'clName'],
  data() {
    return {
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
  computed: {
    ruleClName() {
      return this.$route.query.ruleClName
    },
    ruleDbName() {
      return this.$route.query.ruleDbName
    }
  },
  methods: {
    fnGetTelIdsOfEachRule(rule) {
      const telIds = rule.data.map(data => data._id)
      return telIds
    },
    moveDocument() {
      const _this = this
      let title = "迁移到"
      let confirm = new Vue(DomainEditor)
      confirm.open(title).then(function(fields) {
        const { dbName, clName } = fields
        async function batch(rules) {
          for (let rule of rules) {
            let args = [{
              ruleId: rule._id,
              docIds: _this.fnGetTelIdsOfEachRule(rule)
            }]
            await apiDoc.movebyRule(dbName, clName, _this.dbName, _this.clName, _this.ruleDbName, _this.ruleClName, args).then(result => {          
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
    }
  },
  mounted() {
    apiDoc.listByRule(this.dbName, this.clName, this.ruleDbName, this.ruleClName)
      .then(data => { 
        this.schemas = data.schemas
        this.failed = data.failed
        this.rules = this.failed.concat(data.passed) 
      }).then(() => {
        apiCol.byName(this.dbName, this.clName).then(collection => {
          this.collection = collection
        })
      })
  }
}
</script>
<style lang="css">
@import "../assets/css/common.css"
</style>