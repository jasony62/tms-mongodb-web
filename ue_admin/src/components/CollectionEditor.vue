<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane label="基本信息" name="first"></el-tab-pane>
      <el-tab-pane label="设置" name="second"></el-tab-pane>
    </el-tabs>
    <el-form ref="form" :model="collection" label-position="top" v-show="activeTab==='first'">
      <el-form-item label="集合名称（英文）">
        <el-input v-model="collection.name"></el-input>
      </el-form-item>
      <el-form-item label="集合显示名（中文）">
        <el-input v-model="collection.title"></el-input>
      </el-form-item>
      <el-form-item label="集合文档内容定义（默认）">
        <el-select v-model="collection.schema_id" clearable placeholder="请选择定义名称">
          <el-option v-for="item in schemas" :key="item._id" :label="item.title" :value="item._id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="集合文档内容定义（定制）">
        <el-select v-model="collection.schema_tags" clearable multiple placeholder="请选择定义标签">
          <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="默认展示（定制）">
        <el-select v-model="collection.schema_default_tags" clearable multiple placeholder="请选择定义标签">
          <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="集合标签">
        <el-select v-model="collection.tags" clearable multiple placeholder="请选择集合标签">
          <el-option v-for="tag in tags" :key="tag._id" :label="tag.name" :value="tag.name"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="集合用途">
        <el-select v-model="collection.usage" clearable placeholder="请选择集合用途">
          <el-option label="普通集合" :value="0"></el-option>
          <el-option label="从集合" :value="1"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="说明">
        <el-input type="textarea" v-model="collection.description"></el-input>
      </el-form-item>
    </el-form>
    <el-form ref="form" :model="collection.custom" label-position="top" v-show="activeTab==='second'">
      <el-form-item label="文档操作">
        <el-checkbox v-model="collection.custom.docOperations.create">添加数据</el-checkbox>
        <el-checkbox v-model="collection.custom.docOperations.edit">修改</el-checkbox>
        <el-checkbox v-model="collection.custom.docOperations.remove">删除</el-checkbox>
        <el-checkbox v-model="collection.custom.docOperations.editMany">批量修改</el-checkbox>
        <el-checkbox v-model="collection.custom.docOperations.removeMany">批量删除</el-checkbox>
        <el-checkbox v-model="collection.custom.docOperations.transferMany">批量迁移</el-checkbox>
        <el-checkbox v-model="collection.custom.docOperations.import">导入数据</el-checkbox>
        <el-checkbox v-model="collection.custom.docOperations.export">导出数据</el-checkbox>
        <el-checkbox v-model="collection.custom.docOperations.copyMany">批量复制</el-checkbox>
      </el-form-item>
      <el-form-item label="文档操作规则">
        <el-checkbox v-model="collection.operateRules.scope.unrepeat">添加/导入数据时去重</el-checkbox>
      </el-form-item>
      <el-form-item label="设置去重规则" v-if="collection.operateRules.scope.unrepeat===true" class="tmw-formItem__flex">
        <el-select v-model="collection.operateRules.unrepeat.database" value-key="sysname" @clear="listDbByKw" @change="changeDb" placeholder="请选择数据库" clearable filterable remote :remote-method="listDbByKw" :loading="criteria.databaseLoading">
          <el-option v-for="item in criteria.databases" :key="item._id" :label="item.label" :value="item"></el-option>
          <el-option :disabled="true" value="" v-if="criteria.dbBatch.pages>1">
            <el-pagination :current-page="criteria.dbBatch.page" :total="criteria.dbBatch.total" :page-size="criteria.dbBatch.size" layout="prev, next" @current-change="changeDbPage">
            </el-pagination>
          </el-option>
        </el-select>
        <el-select v-model="collection.operateRules.unrepeat.collection" value-key="sysname" @clear="listClByKw" @change="changeCl" placeholder="请选择集合" clearable filterable remote :remote-method="listClByKw" :loading="criteria.collectionLoading">
          <el-option v-for="item in criteria.collections" :key="item._id" :label="item.label" :value="item"></el-option>
          <el-option :disabled="true" value="" v-if="criteria.clBatch.pages>1">
            <el-pagination :current-page="criteria.clBatch.page" :total="criteria.clBatch.total" :page-size="criteria.clBatch.size" layout="prev, next" @current-change="changeClPage">
            </el-pagination>
          </el-option>
        </el-select>
        <el-select v-model="collection.operateRules.unrepeat.primaryKeys" placeholder="请选择列" filterable multiple>
          <el-option v-for="item in criteria.properties" :key="item.value" :label="item.label" :value="item.value"></el-option>
        </el-select>
        <el-select v-model="collection.operateRules.unrepeat.insert" placeholder="是否插入当前表" v-if="collection.operateRules.unrepeat.collection.sysname!==collection.sysname">
          <el-option label="是" :value="true"></el-option>
          <el-option label="否" :value="false"></el-option>
        </el-select>
      </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button type="primary" @click="onSubmit">提交</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </div>
  </el-dialog>
</template>
<script>
import { Batch, startBatch } from 'tms-vue'
import apiDb from '../apis/database'
import apiCollection from '../apis/collection'
import apiSchema from '../apis/schema'
import apiTag from '../apis/tag'

// 查找条件下拉框分页包含记录数
const SELECT_PAGE_SIZE = 7

export default {
  name: 'CollectionEditor',
  props: {
    dialogVisible: { default: true },
    bucketName: { type: String },
    dbName: { type: String },
    collection: {
      type: Object,
      default: function() {
        return {
          name: '',
          title: '',
          description: '',
          schema_id: '',
          schema_tags: [],
          schema_default_tags: [],
          tags: [],
          usage: '',
          custom: {
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
            }
          },
          operateRules: {
            scope: {
              unrepeat: false
            },
            unrepeat: {
              database: {},
              collection: {},
              primaryKeys: [],
              insert: false
            }
          }
        }
      }
    }
  },
  data() {
    return {
      activeTab: 'first',
      mode: '',
      destroyOnClose: true,
      closeOnClickModal: false,
      schemas: [],
      tags: [],
      criteria: {
        databaseLoading: false,
        databases: [],
        dbBatch: new Batch(),
        collectionLoading: false,
        collections: [],
        clBatch: new Batch(),
        properties: {}
      }
    }
  },
  mounted() {
    apiSchema.listSimple(this.bucketName).then(schemas => {
      this.schemas = schemas
    })
    apiTag.list(this.bucketName).then(tags => {
      this.tags = tags
    })
    let {
      collection: {
        operateRules: {
          unrepeat: { database, collection, primaryKeys }
        }
      }
    } = this
    const dbKey = database.name ? database.name : null
    this.listDbByKw(database.name)

    if (database.name) {
      const clKey = collection.name ? collection.name : null
      this.listClByKw(clKey)
    }
    if (database.name && collection.name) {
      this.listProperties()
    }
  },
  methods: {
    changeDb() {
      this.collection.operateRules.unrepeat.collection = {}
      this.criteria.clBatch = startBatch(this.batchCollection, [null], {
        size: SELECT_PAGE_SIZE
      })
      this.changeCl()
    },
    changeCl() {
      let { primaryKeys, collection } = this.collection.operateRules.unrepeat
      primaryKeys.splice(0, primaryKeys.length)
      if (collection && collection.sysname) {
        this.listProperties()
      }
    },
    listProperties() {
      let { database, collection } = this.collection.operateRules.unrepeat
      apiCollection
        .byName(this.bucketName, database.name, collection.name)
        .then(result => {
          this.criteria.properties = Object.entries(
            result.schema.body.properties
          ).map(([key, value]) => {
            return { value: key, label: `${value.title} (${key})` }
          })
        })
    },
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
      return apiDb
        .list(this.bucketName, {
          keyword,
          ...batchArg
        })
        .then(result => {
          this.criteria.databaseLoading = false
          this.criteria.databases = result.databases.map(db => {
            return {
              name: db.name,
              sysname: db.sysname,
              label: `${db.title} (${db.name})`
            }
          })
          return result
        })
    },
    listClByKw(keyword) {
      this.criteria.clBatch = startBatch(this.batchCollection, [keyword], {
        size: SELECT_PAGE_SIZE
      })
    },
    batchCollection(keyword, batchArg) {
      this.criteria.collectionLoading = true
      let { database } = this.collection.operateRules.unrepeat

      if (database.name) {
        return apiCollection
          .list(this.bucketName, database.name, {
            keyword,
            ...batchArg
          })
          .then(result => {
            this.criteria.collections = result.collections.map(cl => {
              return {
                name: cl.name,
                sysname: cl.sysname,
                label: `${cl.title} (${cl.name})`
              }
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
    changeClPage(page) {
      this.criteria.clBatch.goto(page)
    },
    onSubmit() {
      let {
        collection: {
          operateRules: {
            scope: { unrepeat },
            unrepeat: { database, collection, primaryKeys }
          }
        }
      } = this
      if (unrepeat) {
        if (!database.label || !collection.label || !primaryKeys.length) {
          return Message.error('请选择去重时的比对库或表或列')
        }
        database.label && delete database.label
        collection.label && delete collection.label
      }
      if (this.mode === 'create')
        apiCollection
          .create(this.bucketName, this.dbName, this.collection)
          .then(newCollection => this.$emit('submit', newCollection))
      else if (this.mode === 'update')
        apiCollection
          .update(
            this.bucketName,
            this.dbName,
            this.collection.fromDatabase,
            this.collection
          )
          .then(newCollection => this.$emit('submit', newCollection))
    },
    open(mode, bucketName, dbName, collection) {
      this.mode = mode
      this.bucketName = bucketName
      this.dbName = dbName
      if (mode === 'update') {
        this.collection = JSON.parse(
          JSON.stringify(Object.assign(this.collection, collection))
        )
      }
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', newCollection => {
          this.dialogVisible = false
          resolve(newCollection)
        })
      })
    }
  }
}
</script>
