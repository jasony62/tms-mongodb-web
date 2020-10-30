<template>
  <el-dialog :visible.sync="dialogVisible" :destroy-on-close="destroyOnClose" :close-on-click-modal="closeOnClickModal">
    <div slot="title">{{title}}</div>
    <el-form ref="form" :model="form" label-position="top">
      <el-form-item label="选择数据库">
        <el-select v-model="form.dbName" placeholder="请选择" @change="changeDdName" clearable filterable>
          <el-option v-for="db in dbs" :key="db._id" :label="db.title" :value="db.name"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="选择文档">
        <el-select v-model="form.clName" placeholder="请选择" clearable filterable>
          <el-option v-for="cl in cls" :key="cl._id" :label="cl.title" :value="cl.name"></el-option>
        </el-select>
      </el-form-item>
    </el-form>
    <div slot="footer">
      <el-button type="primary" @click="confirm">确定</el-button>
      <el-button @click="dialogVisible = false">取消</el-button>
    </div>
  </el-dialog>
</template>
<script>
import Vue from 'vue'
import { Dialog, Form, FormItem, Select, Option, Button } from 'element-ui'
Vue.use(Dialog)
  .use(Form)
  .use(FormItem)
	.use(Select)
  .use(Option)
  .use(Button)

import createDbApi from '../apis/database'
import createCollectionApi from '../apis/collection'

export default {
  name: 'DomainEditor',
  props: {
		dialogVisible: { default: true },
		tmsAxiosName: { type: String },
		bucketName: { type: String }
  },
  data() {
    return {
      destroyOnClose: true,
      closeOnClickModal: false,
      dbs: [],
      cls: [],
      form: {
        dbName: "",
        clName: ""
      }
    }
  },
  mounted() {
		createDbApi(this.TmsAxios(this.tmsAxiosName))
			.list(this.bucketName).then(dbs => {
				this.dbs = dbs
			})
  },
  methods: {
    changeDdName() {
			createCollectionApi(this.TmsAxios(this.tmsAxiosName))
				.list(this.bucketName, this.form.dbName).then(cls => {
					this.cls = cls
				})
    },
    confirm() {
      this.$emit('submit', this.form)
    },
    open(tmsAxiosName, bucketName, config) {
			this.tmsAxiosName = tmsAxiosName
			this.bucketName = bucketName
      this.title = config.title ? config.title : ""
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', formData => {
          this.dialogVisible = false
          resolve(formData)
        })
      })
    }
  }
}
</script>