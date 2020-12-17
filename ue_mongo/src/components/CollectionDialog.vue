<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <el-table :data="docs" stripe ref="multipleTable" style="width: 100%">
      <el-table-column v-for="(s, k) in collection.schema.body.properties" :key="k" :prop="k" :label="s.title"></el-table-column>
    </el-table>
    <div class="block">
      <el-pagination :current-page="page.at" :page-sizes="[50, 100, 200]" :page-size="100" layout="total, sizes, prev, pager, next" :total="page.total">
      </el-pagination>
    </div>
    <div slot="footer">
      <el-button type="primary" @click="confirm">确定</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </div>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Dialog, Table, TableColumn, Button, Pagination } from 'element-ui'
Vue.use(Dialog).use(Table).use(TableColumn).use(Button).use(Pagination)

export default {
  name: 'CollectionDialog',
  props: {
    dialogVisible: { default: true },
  },
  data() {
    return {
      destroyOnClose: true,
      closeOnClickModal: false,
      docs: [],
      page: {
        at: 1,
        size: 15,
        total: 0,
      },
    }
  },
  methods: {
    confirm() {
      this.$emit('submit', this.docs)
    },
    open(docs, collection) {
      this.docs = docs
      this.collection = collection
      this.page.total = docs.length
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise((resolve) => {
        this.$on('submit', (tableData) => {
          this.dialogVisible = false
          resolve(tableData)
        })
      })
    },
  },
}
</script>