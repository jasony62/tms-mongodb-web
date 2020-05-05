<template>
  <tms-frame id="tmw-database" :display="{ header: true, footer: true, right: true }" :leftWidth="'20%'">
    <template v-slot:header></template>
    <template v-slot:center>
      <el-form>
        <el-radio-group v-model="activeTab">
          <el-radio-button label="database">数据库</el-radio-button>
          <el-radio-button label="schema">集合列定义</el-radio-button>
          <el-radio-button label="attribute">库/文档属性定义</el-radio-button>
        </el-radio-group>
      </el-form>
      <el-table v-show="activeTab === 'database'" :data="dbs" class="table-fixed" stripe style="width: 100%">
        <el-table-column label="数据库" width="180">
          <template slot-scope="scope">
            <router-link :to="{ name: 'database', params: { dbName: scope.row.name } }">{{ scope.row.name }}</router-link>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editDb(scope.row, scope.$index)">修改</el-button>
            <el-button type="text" size="mini" @click="handleDb(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-table v-show="activeTab === 'schema'" :data="schemas" stripe style="width: 100%">
        <el-table-column prop="title" label="名称" width="180">
        </el-table-column>
        <el-table-column prop="description" label="说明"> </el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index, 'schema', true)">复制</el-button>
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index, 'schema')">修改</el-button>
            <el-button type="text" size="mini" @click="handleSchema(scope.row, 'schema')">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-table v-show="activeTab === 'attribute'" :data="attributes" stripe style="width: 100%">
        <el-table-column prop="title" label="名称" width="180">
        </el-table-column>
        <el-table-column prop="description" label="说明"> </el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index, 'attribute', true)">复制</el-button>
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index, 'attribute')">修改</el-button>
            <el-button type="text" size="mini" @click="handleSchema(scope.row, 'attribute')">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
    <template v-slot:right>
      <el-button @click="createDb" v-if="activeTab === 'database'">添加数据库</el-button>
      <el-button @click="createSchema('schema')" v-if="activeTab === 'schema'">添加集合列定义</el-button>
      <el-button @click="createSchema('attribute')" v-if="activeTab === 'attribute'">添加库/文档属性定义</el-button>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { mapState, mapMutations, mapActions } from 'vuex'
import { Frame, Flex } from 'tms-vue-ui'
Vue.use(Frame).use(Flex)

import DbEditor from '../components/DbEditor.vue'
import SchemaEditor from '../components/SchemaEditor.vue'

export default {
  name: 'Home',
  props: ['bucketName'],
  data() {
    return {
      activeTab: 'database'
    }
  },
  computed: {
    ...mapState(['dbs', 'schemas', 'attributes'])
  },
  methods: {
    ...mapMutations([
      'appendDatabase',
      'updateDatabase',
      'appendSchema',
      'updateSchema'
    ]),
    ...mapActions(['listDatabase', 'removeDb', 'listSchema', 'removeSchema']),
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
    createSchema(type) {
      const editor = new Vue(SchemaEditor)
      editor.open('create', this.bucketName, type).then(newSchema => {
        this.appendSchema({ schema: newSchema, type })
      })
    },
    editSchema(schema, index, type, isCopy = false) {
      let newObj = { ...schema }
      if (isCopy) {
        newObj.title = newObj.title + '-复制'
        delete newObj._id
      }
      const editor = new Vue(SchemaEditor)
      editor.open(newObj, this.bucketName, type, isCopy).then(newSchema => {
        if (isCopy) {
          this.appendSchema({ schema: newSchema, type })
        } else {
          this.updateSchema({ schema: newSchema, index, type })
        }
      })
    },
    handleSchema(schema, type) {
      this.$customeConfirm('列定义', () => {
        return this.removeSchema({ bucket: this.bucketName, schema, type })
      })
    }
  },
  mounted() {
    this.listDatabase({ bucket: this.bucketName })
    this.listSchema({ bucket: this.bucketName, scope: 'document' })
    this.listSchema({ bucket: this.bucketName, scope: ['db', 'collection'] })
  }
}
</script>
