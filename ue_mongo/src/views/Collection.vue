<template>
  <tms-frame
    class="tmw-document"
    :display="{ header: true, footer: true, right: true }"
    :leftWidth="'20%'"
  >
    <template v-slot:header>
      <router-link :to="{
          name: 'database',
          params: { dbName }
        }">返回</router-link>
    </template>
    <template v-slot:center>
      <tms-flex class="tmw-filter">
        <el-input  v-model="input" size="small" placeholder="请输入关键词" class="tmw-filter__inputWithSelect">
          <el-select v-model="select" placeholder="选择条件" slot="prepend" @change="handleSelect">
            <el-option v-for="(s, k) in collection.schema.body.properties" :key="k" :label="s.title" :value="k"></el-option>
          </el-select>
          <el-button slot="append" icon="el-icon-search" @click="handleButton"></el-button>
        </el-input>
        <el-button size="small" class="tmw-filter__button" icon="el-icon-delete" @click="resetFilter">重置</el-button>
      </tms-flex>
      <div class="tmw-tags">
        <el-tag v-for="tag in dynamicTags" :key="tag.id" closable :disable-transitions="false" @close="removeTag(tag)">{{tag.label}}:{{tag.value}}</el-tag>
      </div>
      <el-table 
        :data="documents" 
        stripe 
        ref="multipleTable" 
        style="width: 100%" 
        @selection-change="handleSelectDocument"
        :row-key="getRowKeys">
        <el-table-column type="selection" :reserve-selection="true" width="55"></el-table-column>
        <el-table-column
          v-for="(s, k) in collection.schema.body.properties"
          :key="k"
          :prop="k"
          :label="s.title"
        ></el-table-column>
        <el-table-column fixed="right" label="操作" width="180">
          <template slot-scope="scope">
            <el-button size="mini" @click="editDocument(scope.row)">修改</el-button>
            <el-button size="mini" @click="removeDocument(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <tms-flex class="tmw-pagination">
        <span class="tmw-pagination__text">已选中 {{selectionLen}} 条数据</span>
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
        <div><el-button @click="batchEditDocument">批量修改</el-button></div>
        <div><el-button @click="batchRemoveDocument">批量删除</el-button></div>
        <div><el-button @click="createDocument">添加数据</el-button></div>
        <el-upload :action="uploadUrl()" :show-file-list="false" :on-success="importSuccess" :on-progress="importProcess">
          <el-button>导入数据</el-button>
        </el-upload>
        <el-dropdown size="medium" placement="right-start" @command="fnChooseCommand">
          <el-button>数据迁移</el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="checked">按选中</el-dropdown-item>
            <el-dropdown-item command="rule">按规则</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <div><el-button @click="exportDocument">导出数据</el-button></div>
      </tms-flex>      
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { mapState } from 'vuex'
import { Frame, Flex } from 'tms-vue-ui'
Vue.use(Frame)
Vue.use(Flex)
import { Table, TableColumn, Input, Row, Col, Button, Upload, Pagination, Message, MessageBox, Tag, Dropdown, DropdownMenu, DropdownItem, } from 'element-ui'
Vue.use(Table)
  .use(TableColumn)
  .use(Input)
  .use(Row)
  .use(Col)
  .use(Button)
  .use(Upload)
  .use(Pagination)
  .use(Tag)
  .use(Dropdown)
  .use(DropdownMenu)
  .use(DropdownItem)
Vue.prototype.$message = Message
Vue.prototype.$confirm = MessageBox.confirm

import DocEditor from '../components/DocEditor.vue'
import ColumnValueEditor from '../components/ColumnValueEditor.vue'
import DomainEditor from '../components/DomainEditor.vue'
import { collection as apiCol, doc as apiDoc, plugin as apiPlugin } from '../apis'

export default {
  name: 'Collection',
  props: ['dbName', 'clName'],
  data() {
    return {
      input: "",
      select: "",
      filter: {},
      dynamicTags: [],
      page: {
				at: 1,
				size: 100,
				total: 0    
      },
      getRowKeys(row) {
        return row._id
      },
      shiftDocumentIds: [],
      collection: { schema: { body: { properties: {} } } }
    }
  },
  computed: {
    ...mapState(['documents']),
    selectionLen() {
      return this.shiftDocumentIds.length;
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
    listPlugin() {
      apiPlugin.list().then(plugins => {
        this.plugins = plugins
      })
    },
    listDocument() {
      this.$store.dispatch({
        type: 'listDocument',
        db: this.dbName,
        cl: this.clName,
        page: this.page,
        filter: {'filter': this.filter}
      }).then(result => {
        this.page.total = result.result.total
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
    removeDocument(document) {
      this.$confirm('确定删除该条数据?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        apiDoc.remove(this.dbName, this.clName, document._id).then(() => {
          Message.success({ message: '删除成功' })
          const realAt =  Math.ceil((this.page.total - 1) / this.page.size)
          this.page.at = realAt > this.page.at ? this.page.at : realAt
          this.listDocument()
          this.shiftDocumentIds = []
        })
      }).catch(() => {})
    },
    batchEditDocument() {
      let _this = this
      let editor = new Vue(ColumnValueEditor)
      editor.open(this.dbName, this.collection).then(result => {
        Message.success({ message: '已成功修改' + result.n + '条' })
        _this.listDocument()
      })
    },
    batchRemoveDocument() {
      if (!this.shiftDocumentIds.length) {
        Message.info({ message: "请选择需要删除的数据"})
        return false
      }
      this.$confirm('确定删除数据?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        apiDoc.batchRemove(this.dbName, this.clName, this.shiftDocumentIds).then(data => {
          Message.success({ message: '已成功删除' + data.n + '条'})
          const realAt =  Math.ceil((this.page.total - data.n) / this.page.size)
          this.page.at = realAt > this.page.at ? this.page.at : realAt
          this.listDocument()
          this.$refs.multipleTable.clearSelection()
          this.shiftDocumentIds = []
        })
      }).catch(() => {})
    },
    handleButton() {
      if (!this.select || !this.input) {
        Message.info({ message: '请确认是否选择条件或输入关键词'})
        return false
      }
      this.$set(this.filter, this.select, this.input.replace(/^\s+|\s+$/g,""))
      if (this.dynamicTags.length) {
        this.dynamicTags.forEach(tag => {
          if (tag && tag.id===this.select) {
            tag.value = this.input
          } 
        })
        if (this.dynamicTags.every(ele => ele.id !== this.select)) {
          this.addSearch();
        }
      } else {
        this.addSearch();
      }
    },
    addSearch() {
      this.dynamicTags.push({
        id: this.select,
        label: this.collection.schema.body.properties[this.select].title,
        value: this.input
      })
    },
    removeTag(tag) {
      this.dynamicTags.forEach((item, index) => {
        if (item.id===tag.id) {
          this.dynamicTags.splice(index, 1)
          if (this.select===tag.id) {
            this.select = ""
            this.input = ""
          }
          delete this.filter[tag.id]
        }
      })
      this.listDocument()
    },
    handleSelect() {
      let value = this.filter[this.select]
      this.input = value ? value : ""
    },
    resetFilter() {
      this.input = ""
      this.select = ""
      this.filter = {}
      this.dynamicTags = []
    },
    handleSize(val) {
			this.page.size = val
			this.listDocument()
		},
		handleCurrentPage(val) {
			this.page.at = val
			this.listDocument()
    },
    handleSelectDocument(rows) {
      this.shiftDocumentIds = []
      if (rows) {
        rows.forEach(row => {
          if (row) {
            this.shiftDocumentIds.push(row._id)
          }
        })
      }
    },
    uploadUrl() {
      return '/mgdb/api/mongo/document/uploadToImport?db=' + this.dbName + '&cl=' + this.clName + '&access_token=' + sessionStorage.getItem('access_token')
    },
    importProcess() {
       Message.info({ message: '导入中...' })
    },
    importSuccess() {
      Message.success({ message: '导入成功' })
      this.listDocument()
    },
    fnChooseCommand(command) {
      switch(command) {
        case 'checked':
          this.moveDocumentByChecked()
          break;
        case 'rule':
          this.moveDocumentByRule()   
          break
      }
    },
    fnMoveDocument(args) {
      let confirm = new Vue(DomainEditor)
      let title = "迁移到"
      confirm.open(title).then(fields => {
        const { dbName, clName } = fields
        apiDoc.move(this.dbName, this.clName, dbName, clName, args).then(result => {  
          Message.success({ message: '共迁移'+ result.planMoveTotal +'条，成功' + result.factMoveTotal +'条，失败'+ result.failMoveTotal +'条'})
          this.page.at = 1
          this.listDocument()
          this.$refs.multipleTable.clearSelection()
          this.shiftDocumentIds = []       
        })
      })
    },
    moveDocumentByChecked() {
      if(!this.shiftDocumentIds.length) { 
        Message.info({ message: '请选择需要迁移的数据' })
        return false
      }  
      this.fnMoveDocument({'docIds': this.shiftDocumentIds})     
    },  
    moveDocumentByRule() {
      let confirm = new Vue(DomainEditor)
      let title = "选定规则表"
      confirm.open(title).then(fields => {
        const { dbName, clName } = fields
        this.$router.push({
          path: `/rule/${this.dbName}/${this.clName}`,
          query: {
            'ruleDbName': dbName,
            'ruleClName': clName
          }
        })
      })
    },
    exportDocument() {
      apiDoc.export(this.dbName, this.clName).then(data => {
        const access_token = sessionStorage.getItem('access_token')
        window.open(`/mgdb/api/download/down?access_token=${access_token}&file=${data}`)
      })
    }
  },
  mounted() {
    apiCol.byName(this.dbName, this.clName).then(collection => {
      this.collection = collection
      this.listDocument()
      this.listPlugin()
    })
  }
}
</script>
<style lang="css">
@import "../assets/css/common.css"
</style>