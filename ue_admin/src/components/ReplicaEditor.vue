<template>
  <el-dialog
    :visible.sync="dialogVisible"
    :destroy-on-close="destroyOnClose"
    :close-on-click-modal="closeOnClickModal"
  >
    <el-form ref="form" :model="replica" label-position="top">
      <el-form-item label="主集合数据库名称">
        <el-select
          v-model="replica.primary.db"
          placeholder="请选择主集合数据库"
          @change="getCollection('primary', replica.primary.db)"
        >
          <el-option
            v-for="db in dbs"
            :key="db._id"
            :label="db.title"
            :value="db.name"
          >
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="主集合名称">
        <el-select v-model="replica.primary.cl" placeholder="请选择主集合名称">
          <el-option
            v-for="cl in primarycls"
            :key="cl._id"
            :label="cl.title"
            :value="cl.name"
          >
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="从集合数据库名称">
        <el-select
          v-model="replica.secondary.db"
          placeholder="请选择从集合数据库"
          @change="getCollection('secondary', replica.secondary.db)"
        >
          <el-option
            v-for="db in dbs"
            :key="db._id"
            :label="db.title"
            :value="db.name"
          >
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="从集合名称">
        <el-select
          v-model="replica.secondary.cl"
          placeholder="请选择从集合名称"
        >
          <el-option
            v-for="cl in secondcls"
            :key="cl._id"
            :label="cl.title"
            :value="cl.name"
          >
          </el-option>
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
import apiDb from '../apis/database'
import apiCl from '../apis/collection'
import apiReplica from '../apis/replica'

export default {
  name: 'ReplicaEditor',
  props: {
    dialogVisible: { default: true },
    bucketName: { type: String },
    replica: {
      type: Object,
      default: function() {
        return { primary: { db: '', cl: '' }, secondary: { db: '', cl: '' } }
      }
    }
  },
  data() {
    return {
      destroyOnClose: true,
      closeOnClickModal: false,
      dbs: [],
      primarycls: [],
      secondcls: []
    }
  },
  mounted() {
    apiDb.list(this.bucketName).then(dbs => (this.dbs = dbs))
  },
  methods: {
    getCollection(type, dbSysName) {
      apiCl.list(this.bucketName, dbSysName).then(collections => {
        if (type === 'primary') {
          this.primarycls = collections.filter(
            collection => !collection.usage && collection.usage !== 1
          )
        } else {
          this.secondcls = collections.filter(
            collection => collection.usage && collection.usage === 1
          )
        }
      })
    },
    onSubmit() {
      apiReplica.create(this.bucketName, this.replica).then(() => {
        const { name: pdname, title: pdtitle } = this.dbs.find(
          db => db.name === this.replica.primary.db
        )
        const { name: sdname, title: sdtitle } = this.dbs.find(
          db => db.name === this.replica.secondary.db
        )
        const { name: pcname, title: pctitle } = this.primarycls.find(
          primarycl => primarycl.name === this.replica.primary.cl
        )
        const { name: scname, title: sctitle } = this.secondcls.find(
          secondcl => secondcl.name === this.replica.secondary.cl
        )
        let result = {
          primary: {
            db: { name: pdname, title: pdtitle },
            cl: { name: pcname, title: pctitle }
          },
          secondary: {
            db: { name: sdname, title: sdtitle },
            cl: { name: scname, title: sctitle }
          }
        }
        this.$emit('submit', result)
      })
    },
    open(bucketName) {
      this.bucketName = bucketName
      this.$mount()
      document.body.appendChild(this.$el)
      return new Promise(resolve => {
        this.$on('submit', newReplica => {
          this.dialogVisible = false
          resolve(newReplica)
        })
      })
    }
  }
}
</script>
