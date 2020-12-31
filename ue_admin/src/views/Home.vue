<template>
  <tms-frame
    id="tmw-database"
    :display="{ header: true, footer: true, right: true }"
    :leftWidth="'20%'"
  >
    <template v-slot:header></template>
    <template v-slot:center>
      <el-form>
        <el-radio-group v-model="activeTab">
          <el-radio-button label="database">数据库</el-radio-button>
          <el-radio-button label="docSchemas">文档内容定义</el-radio-button>
          <el-radio-button label="dbSchemas">数据库属性定义</el-radio-button>
          <el-radio-button label="colSchemas">集合属性定义</el-radio-button>
          <el-radio-button label="tag">标签</el-radio-button>
          <el-radio-button label="replica">全量复制定义</el-radio-button>
        </el-radio-group>
      </el-form>
      <tms-flex direction="column" v-show="activeTab === 'database'">
        <el-table
          :data="dbs"
          stripe
          style="width: 100%"
          @selection-change="changeDbSelect"
          :max-height="dymaicHeight"
        >
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column label="数据库" width="180">
            <template slot-scope="scope">
              <router-link
                :to="{ name: 'database', params: { dbName: scope.row.name } }"
              >{{ scope.row.name }}</router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="名称" width="180"></el-table-column>
          <el-table-column prop="description" label="说明"></el-table-column>
          <el-table-column label="操作" width="120">
            <template slot-scope="scope">
              <el-button type="text" size="mini" @click="editDb(scope.row, scope.$index)">修改</el-button>
              <el-button type="text" size="mini" @click="handleDb(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <tms-flex class="tmw-pagination">
          <span class="tmw-pagination__text">已选中 {{criteria.multipleDb.length}} 条数据</span>
          <el-pagination
            layout="total, sizes, prev, pager, next"
            background
            :total="criteria.dbBatch.total"
            :page-sizes="[10, 25, 50, 100]"
            :current-page="criteria.dbBatch.page"
            :page-size="criteria.dbBatch.size"
            @current-change="changeDbPage"
            @size-change="changeDbSize"
          ></el-pagination>
        </tms-flex>
      </tms-flex>
      <el-table
        v-show="activeTab === 'docSchemas'"
        :data="documentSchemas"
        stripe
        style="width: 100%"
        :max-height="dymaicHeight"
      >
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column label="操作" width="120">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index, true)">复制</el-button>
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index)">修改</el-button>
            <el-button type="text" size="mini" @click="handleSchema(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-table
        v-show="activeTab === 'dbSchemas'"
        :data="dbSchemas"
        stripe
        style="width: 100%"
        :max-height="dymaicHeight"
      >
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column label="操作" width="120">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index, true)">复制</el-button>
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index)">修改</el-button>
            <el-button type="text" size="mini" @click="handleSchema(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-table
        v-show="activeTab === 'colSchemas'"
        :data="collectionSchemas"
        stripe
        style="width: 100%"
        :max-height="dymaicHeight"
      >
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column label="操作" width="120">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index, true)">复制</el-button>
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index)">修改</el-button>
            <el-button type="text" size="mini" @click="handleSchema(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-table
        v-show="activeTab === 'tag'"
        :data="tags"
        stripe
        style="width: 100%"
        :max-height="dymaicHeight"
      >
        <el-table-column prop="name" label="名称"></el-table-column>
        <el-table-column label="操作" width="120">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="handleTag(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <tms-flex direction="column" v-show="activeTab === 'replica'">
        <el-table
          :data="replicas"
          stripe
          style="width: 100%"
          @selection-change="changeReplicaSelect"
          :max-height="dymaicHeight"
        >
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column prop="primary.db.label" label="主数据库名称"></el-table-column>
          <el-table-column prop="primary.cl.label" label="主集合名称"></el-table-column>
          <el-table-column prop="secondary.db.label" label="从数据库名称"></el-table-column>
          <el-table-column prop="secondary.cl.label" label="从集合名称"></el-table-column>
          <el-table-column label="操作" width="120">
            <template slot-scope="scope">
              <el-button type="text" size="mini" @click="handleSyncReplica(scope.row)">同步</el-button>
              <el-button type="text" size="mini" @click="handleReplica(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <tms-flex class="tmw-pagination">
          <span class="tmw-pagination__text">已选中 {{criteria.multipleReplica.length}} 条数据</span>
          <el-pagination
            layout="total, sizes, prev, pager, next"
            background
            :total="criteria.replicaBatch.total"
            :page-sizes="[10, 25, 50, 100]"
            :current-page="criteria.replicaBatch.page"
            :page-size="criteria.replicaBatch.size"
            @current-change="changeReplicaPage"
            @size-change="changeReplicaSize"
          ></el-pagination>
        </tms-flex>
      </tms-flex>
    </template>
    <template v-slot:right>
      <tms-flex direction="column" align-items="flex-start" class="tms-frame__main__right__button">
        <el-button @click="createDb" v-if="activeTab === 'database'">添加数据库</el-button>
        <el-button @click="createSchema('document')" v-if="activeTab === 'docSchemas'">添加文档列定义</el-button>
        <el-button @click="createSchema('db')" v-if="activeTab === 'dbSchemas'">添加数据库属性定义</el-button>
        <el-button @click="createSchema('collection')" v-if="activeTab === 'colSchemas'">添加集合属性定义</el-button>
        <el-button @click="createTag" v-if="activeTab === 'tag'">添加标签</el-button>
        <el-button @click="createReplica" v-if="activeTab === 'replica'">配置复制关系</el-button>
        <!-- <el-button @click="handleSyncAllReplica" v-if="activeTab === 'replica'">批量同步</el-button> -->
      </tms-flex>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { mapState, mapMutations, mapActions } from 'vuex'
import { Batch } from 'tms-vue'
import { Frame, Flex } from 'tms-vue-ui'
Vue.use(Frame).use(Flex)
import { Message } from 'element-ui'

import DbEditor from '../components/DbEditor.vue'
import SchemaEditor from '../components/SchemaEditor.vue'
import TagEditor from '../components/TagEditor.vue'
import ReplicaEditor from '../components/ReplicaEditor.vue'

// 查找条件下拉框分页包含记录数
let LIST_DB_PAGE_SIZE = 100
let LIST_RP_PAGE_SIZE = 100

export default {
  name: 'Home',
  props: ['bucketName'],
  data() {
    return {
      activeTab: 'database',
      dymaicHeight: 0,
      criteria: {
        dbBatch: new Batch(),
        multipleDb: [],
        replicaBatch: new Batch(),
        multipleReplica: []
      }
    }
  },
  created() {
    this.dymaicHeight = window.innerHeight * 0.8
  },
  computed: {
    ...mapState([
      'dbs',
      'documentSchemas',
      'dbSchemas',
      'collectionSchemas',
      'tags',
      'replicas'
    ])
  },
  methods: {
    ...mapMutations([
      'appendDatabase',
      'updateDatabase',
      'appendSchema',
      'updateSchema',
      'appendTag',
      'updateTag',
      'appendReplica'
    ]),
    ...mapActions([
      'listDatabase',
      'removeDb',
      'listSchema',
      'removeSchema',
      'listTags',
      'removeTag',
      'listReplica',
      'removeReplica',
      'syncReplica',
      'synchronizeAll'
    ]),
    createDb() {
      const editor = new Vue(DbEditor)
      editor.open('create', this.bucketName).then(newDb => {
        this.appendDatabase({ db: newDb })
      })
    },
    editDb(db, index) {
      const editor = new Vue(DbEditor)
      editor.open('update', this.bucketName, db).then(newDb => {
        this.updateDatabase({ db: newDb, index })
      })
    },
    handleDb(db) {
      this.$customeConfirm('数据库', () => {
        return this.removeDb({ bucket: this.bucketName, db })
      })
    },
    listDbByKw(keyword) {
      this.listDatabase({
        bucket: this.bucketName,
        keyword: keyword,
        size: LIST_DB_PAGE_SIZE
      }).then(batch => {
        this.criteria.dbBatch = batch
      })
    },
    changeDbPage(page) {
      this.criteria.dbBatch.goto(page)
    },
    changeDbSize(size) {
      this.criteria.dbBatch.size = size
      this.criteria.dbBatch.goto(1)
    },
    changeDbSelect(value) {
      this.criteria.multipleDb = value
    },
    createSchema(scope) {
      const editor = new Vue(SchemaEditor)
      editor.open({ scope }, this.bucketName).then(newSchema => {
        this.appendSchema({ schema: newSchema })
      })
    },
    editSchema(schema, index, isCopy = false) {
      let newObj = { ...schema }
      if (isCopy) {
        newObj.title = newObj.title + '-复制'
        delete newObj._id
      }
      const editor = new Vue(SchemaEditor)
      editor.open(newObj, this.bucketName).then(newSchema => {
        if (isCopy) {
          this.appendSchema({ schema: newSchema })
        } else {
          this.updateSchema({ schema: newSchema, index })
        }
      })
    },
    handleSchema(schema) {
      this.$customeConfirm(schema.title, () => {
        return this.removeSchema({ bucket: this.bucketName, schema })
      })
    },
    createTag() {
      const editor = new Vue(TagEditor)
      editor.open('create', this.bucketName).then(newTag => {
        this.appendTag({ tag: newTag })
      })
    },
    editTag(tag, index) {
      const editor = new Vue(TagEditor)
      editor.open('update', this.bucketName, tag).then(newTag => {
        this.updateTag({ tag: newTag, index })
      })
    },
    handleTag(tag) {
      this.$customeConfirm(tag.name, () => {
        return this.removeTag({ bucket: this.bucketName, tag })
      })
    },
    createReplica() {
      const editor = new Vue(ReplicaEditor)
      editor.open(this.bucketName).then(newReplica => {
        this.appendReplica({ replica: newReplica })
      })
    },
    fnGetParams(replica) {
      const params = {
        primary: {
          db: replica.primary.db.name,
          cl: replica.primary.cl.name
        },
        secondary: {
          db: replica.secondary.db.name,
          cl: replica.secondary.cl.name
        }
      }
      return params
    },
    handleReplica(replica) {
      const params = this.fnGetParams(replica)
      this.$customeConfirm('关联关系', () => {
        return this.removeReplica({ bucket: this.bucketName, params })
      })
    },
    listRpByKw(keyword) {
      this.listReplica({
        bucket: this.bucketName,
        keyword: keyword,
        size: LIST_RP_PAGE_SIZE
      }).then(batch => {
        this.criteria.replicaBatch = batch
      })
    },
    changeReplicaPage(page) {
      this.criteria.replicaBatch.goto(page)
    },
    changeReplicaSize(size) {
      this.criteria.replicaBatch.size = size
      this.criteria.replicaBatch.goto(1)
    },
    changeReplicaSelect(value) {
      this.criteria.multipleReplica = value
    },
    handleSyncReplica(replica) {
      const params = this.fnGetParams(replica)
      this.syncReplica({ bucket: this.bucketName, params }).then(() => {
        Message.success({ message: '同步成功' })
      })
    },
    handleSyncAllReplica() {
      const msg = Message.info({ message: '正在同步...', duration: 0 })
      this.synchronizeAll({
        bucket: this.bucketName,
        params: this.criteria.multipleReplica
      }).then(result => {
        msg.message = `成功${result.success.length}条,失败${result.error.length}条`
        msg.close()
      })
    }
  },
  mounted() {
    this.listDbByKw(null)
    this.listSchema({ bucket: this.bucketName, scope: 'document' })
    this.listSchema({ bucket: this.bucketName, scope: 'db' })
    this.listSchema({ bucket: this.bucketName, scope: 'collection' })
    this.listTags({ bucket: this.bucketName })
    this.listRpByKw(null)
  }
}
</script>
