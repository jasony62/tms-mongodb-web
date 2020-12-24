<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <tms-flex direction="column" :elastic-items="[1]" style="height:100%">
      <tms-flex v-if="usage!==1">
        <el-select v-model="criteria.database" placeholder="选择数据库" clearable filterable remote :remote-method="listDbByKw" :loading="criteria.databaseLoading" style="width:240px">
          <el-option v-for="item in criteria.databases" :key="item.value" :label="item.label" :value="item.value">
          </el-option>
          <el-option :disabled="true" value="" v-if="criteria.dbBatch.pages>1">
            <el-pagination :current-page="criteria.dbBatch.page" :total="criteria.dbBatch.total" :page-size="criteria.dbBatch.size" layout="prev, next" @current-change="changeDbPage">
            </el-pagination>
          </el-option>
        </el-select>
        <el-select v-model="criteria.collection" placeholder="请选择集合" clearable filterable remote :remote-method="listClByKw" :loading="criteria.collectionLoading" style="width:240px">
          <el-option v-for="item in criteria.collections" :key="item.value" :label="item.label" :value="item.value">
          </el-option>
          <el-option :disabled="true" value="" v-if="criteria.clBatch.pages>1">
            <el-pagination :current-page="criteria.clBatch.page" :total="criteria.clBatch.total" :page-size="criteria.clBatch.size" layout="prev, next" @current-change="changeClPage">
            </el-pagination>
          </el-option>
        </el-select>
        <el-button @click="createReclia">关联</el-button>
      </tms-flex>
      <tms-flex direction="column" v-if="replicas.length">
        <el-table :data="replicas" stripe style="width:100%" height="1">
          <el-table-column prop="primary.db.label" label="主数据库名称"></el-table-column>
          <el-table-column prop="primary.cl.label" label="主集合名称"></el-table-column>
          <el-table-column prop="secondary.db.label" label="从数据库名称"></el-table-column>
          <el-table-column prop="secondary.cl.label" label="从集合名称"></el-table-column>
          <el-table-column fixed="right" label="操作" width="120">
            <template slot-scope="scope">
              <el-button type="text" size="mini" @click="syncReplica(scope.row)">同步</el-button>
              <el-button type="text" size="mini" @click="removeReplica(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination :current-page="docBatch.page" :page-sizes="[50, 100, 200]" :page-size="docBatch.size" layout="total, sizes, prev, pager, next" :total="docBatch.total" @current-change="changeDocPage" @size-change="changeDocSize">
        </el-pagination>
      </tms-flex>
    </tms-flex>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Batch, startBatch } from 'tms-vue'
import { Flex } from 'tms-vue-ui'
import {
  Dialog,
  Table,
  TableColumn,
  Select,
  Option,
  Pagination,
  Button,
  Message
} from 'element-ui'
import createDbApi from '../apis/database'
import createClApi from '../apis/collection'
import createRpApi from '../apis/replica'

Vue.use(Flex)
Vue.use(Dialog)
  .use(Table)
  .use(TableColumn)
  .use(Select)
  .use(Option)
  .use(Pagination)
  .use(Button)

// 查找条件下拉框分页包含记录数
const LIST_PAGE_SIZE = 100
const SELECT_PAGE_SIZE = 7

export default {
  name: 'ReplicaEditor',
  props: {
    bucketName: String,
    tmsAxiosName: String,
    dialogVisible: { type: Boolean, default: true },
    collection: Object
  },
  data() {
    return {
      destroyOnClose: true,
      closeOnClickModal: false,
      usage: 0,
      replicas: [],
      docBatch: new Batch(this.batchDocument),
      criteria: {
        databaseLoading: false,
        databases: [],
        dbBatch: new Batch(),
        database: '',
        collections: [],
        collection: '',
        clBatch: new Batch()
      }
    }
  },
  methods: {
    listDbByKw(keyword) {
      this.criteria.dbBatch = startBatch(this.batchDatabase, [keyword], {
        size: SELECT_PAGE_SIZE
      })
    },
    changeDbPage(page) {
      this.criteria.dbBatch.goto(page)
    },
    batchDatabase(keyword, batchArg) {
      this.criteria.databaseLoading = true
      return createDbApi(this.TmsAxios(this.tmsAxiosName))
        .list(this.bucketName, {
          keyword,
          ...batchArg
        })
        .then(result => {
          this.criteria.databaseLoading = false
          this.criteria.databases = result.databases.map(db => {
            return { value: db.name, label: `${db.title} (${db.name})` }
          })
          return result
        })
    },
    listClByKw(keyword) {
      this.criteria.clBatch = startBatch(this.batchCollection, [keyword], {
        size: SELECT_PAGE_SIZE
      })
    },
    changeClPage(page) {
      this.criteria.clBatch.goto(page)
    },
    batchCollection(keyword, batchArg) {
      this.criteria.collectionLoading = true
      if (this.criteria.database) {
        return createClApi(this.TmsAxios(this.tmsAxiosName))
          .list(this.bucketName, this.criteria.database, {
            keyword,
            ...batchArg
          })
          .then(result => {
            this.criteria.collections = result.collections
              .filter(cl => cl.usage === 1)
              .map(cl => {
                return { value: cl.name, label: `${cl.title} (${cl.name})` }
              })
            this.criteria.collectionLoading = false
            return result
          })
      } else {
        this.criteria.collections = []
        this.criteria.collectionLoading = false
        return Promise.resolve({ total: 0 })
      }
    },
    listDocByKw(keyword) {
      this.replicas = startBatch(this.batchDocument, [keyword], {
        size: SELECT_PAGE_SIZE
      })
    },
    changeDocSize(size) {
      this.docBatch.size = size
      this.docBatch.goto(1)
    },
    changeDocPage(page) {
      this.docBatch.goto(page)
    },
    batchDocument(batchArg) {
      return createRpApi(this.TmsAxios(this.tmsAxiosName))
        .list(this.bucketName, batchArg)
        .then(result => {
          this.replicas = result.map(result => {
            let {
              primary: { db: pdb, cl: pcl },
              secondary: { db: sdb, cl: scl }
            } = result
            ;[pdb, pcl, sdb, scl].forEach(item => {
              item.label = `${item.title} (${item.name})`
            })
            return {
              primary: { db: pdb, cl: pcl },
              secondary: { db: sdb, cl: scl }
            }
          })
          return result
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
    createReclia() {
      const secondary = {
        db: this.criteria.database,
        cl: this.criteria.collection
      }
      const params = { ...this.primary, secondary: secondary }
      createRpApi(this.TmsAxios(this.tmsAxiosName))
        .create(this.bucketName, params)
        .then(() => {
          this.listDocByKw(this.primary)
        })
    },
    syncReplica(replica) {
      const params = this.fnGetParams(replica)
      createRpApi(this.TmsAxios(this.tmsAxiosName))
        .synchronize(this.bucketName, params)
        .then(() => {
          Message.success({ message: '同步成功' })
        })
    },
    removeReplica(replica) {
      const params = this.fnGetParams(replica)
      this.replicas.splice(this.replicas.indexOf(params), 1)
      createRpApi(this.TmsAxios(this.tmsAxiosName))
        .remove(this.bucketName, params)
        .then(() => {
          Message.success({ message: '删除成功' })
        })
    },
    open(bucketName, tmsAxiosName, collection) {
      this.bucketName = bucketName
      this.tmsAxiosName = tmsAxiosName
      this.primary = {
        primary: { db: collection.db.name, cl: collection.name }
      }
      this.usage = collection.hasOwnProperty('usage') ? collection.usage : ''
      this.$mount()
      document.body.appendChild(this.$el)
    }
  },
  watch: {
    'criteria.database': function() {
      this.criteria.collection = null
      this.criteria.clBatch = startBatch(this.batchCollection, [null], {
        size: SELECT_PAGE_SIZE
      })
    }
  },
  mounted() {
    this.docBatch.size = LIST_PAGE_SIZE
    let { criteria, replicas } = this
    this.listClByKw(null)
    this.listDocByKw(this.primary)
  },
  beforeDestroy() {
    document.body.removeChild(this.$el)
  }
}
</script>
<style lang="less" scoped>
.el-dialog__wrapper {
  /deep/ .el-dialog {
    width: 80%;
  }
  /deep/ .el-dialog__body {
    height: 60vh;
    padding-bottom: 0;
    .el-select {
      .el-input {
        width: 100%;
      }
    }
  }
}
</style>