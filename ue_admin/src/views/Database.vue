<template>
  <tms-frame
    class="tmw-collection"
    :display="{ header: true, footer: true, right: true }"
    :leftWidth="'20%'"
  >
    <template v-slot:header>
      <el-breadcrumb separator-class="el-icon-arrow-right">
        <el-breadcrumb-item :to="{ name: 'home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>{{ dbName }}</el-breadcrumb-item>
      </el-breadcrumb>
    </template>
    <template v-slot:center>
      <tms-flex direction="column">
        <el-table
          :data="collections"
          stripe
          style="width: 100%"
          @selection-change="changeClSelect"
          :max-height="dymaicHeight"
        >
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column label="collection" width="180">
            <template slot-scope="scope">
              <router-link
                :to="{name: 'collection', params: { dbName, clName: scope.row.name }}"
              >{{ scope.row.name }}</router-link>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="名称" width="180"></el-table-column>
          <el-table-column label="集合类型" width="180">
            <template slot-scope="scope">
              <span>{{ "usage" in scope.row ? scope.row.usage == 1 ? "从集合" : "普通集合" : ""}}</span>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="说明"></el-table-column>
          <el-table-column fixed="right" label="操作" width="120">
            <template slot-scope="scope">
              <el-button @click="editCollection(scope.row, scope.$index)" type="text" size="mini">修改</el-button>
              <el-button @click="handleCollection(scope.row)" type="text" size="mini">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <tms-flex class="tmw-pagination">
          <span class="tmw-pagination__text">已选中 {{multipleCl.length}} 条数据</span>
          <el-pagination
            layout="total, sizes, prev, pager, next"
            background
            :total="clBatch.total"
            :page-sizes="[10, 25, 50, 100]"
            :current-page="clBatch.page"
            :page-size="clBatch.size"
            @current-change="changeClPage"
            @size-change="changeClSize"
          ></el-pagination>
        </tms-flex>
      </tms-flex>
    </template>
    <template v-slot:right>
      <el-button @click="createCollection">添加集合</el-button>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { mapState, mapMutations, mapActions } from 'vuex'
import { Batch } from 'tms-vue'
import { Frame } from 'tms-vue-ui'
Vue.use(Frame)

import CollectionEditor from '../components/CollectionEditor.vue'

// 查找条件下拉框分页包含记录数
let LIST_PAGE_SIZE = 100

export default {
  name: 'Database',
  props: ['bucketName', 'dbName'],
  computed: {
    ...mapState(['collections'])
  },
  data() {
    return {
      clBatch: new Batch(),
      multipleCl: []
    }
  },
  created() {
    this.dymaicHeight = window.innerHeight * 0.8
  },
  methods: {
    ...mapMutations(['appendCollection', 'updateCollection']),
    ...mapActions(['listCollection', 'removeCollection']),
    createCollection() {
      let editor = new Vue(CollectionEditor)
      editor
        .open('create', this.bucketName, this.dbName)
        .then(newCollection => {
          this.appendCollection({ collection: newCollection })
          this.listClByKw(null)
        })
    },
    editCollection(collection, index) {
      let editor = new Vue(CollectionEditor)
      editor
        .open('update', this.bucketName, this.dbName, {
          ...collection,
          fromDatabase: collection.name
        })
        .then(newCollection => {
          this.updateCollection({ collection: newCollection, index })
        })
    },
    handleCollection(collection) {
      this.$customeConfirm(
        '集合',
        () => {
          return this.removeCollection({
            bucket: this.bucketName,
            db: this.dbName,
            collection
          })
        },
        this.listClByKw
      )
    },
    listClByKw(keyword) {
      this.listCollection({
        bucket: this.bucketName,
        db: this.dbName,
        keyword: keyword,
        size: LIST_PAGE_SIZE
      }).then(batch => {
        this.clBatch = batch
      })
    },
    changeClPage(page) {
      this.clBatch.goto(page)
    },
    changeClSize(size) {
      this.clBatch.size = size
      this.clBatch.goto(1)
    },
    changeClSelect(value) {
      this.multipleCl = value
    }
  },
  mounted() {
    this.listClByKw(null)
  }
}
</script>
