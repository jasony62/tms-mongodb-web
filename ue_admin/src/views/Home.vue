<template>
  <tms-frame id="tmw-database" :display="{ header: true, footer: true, right: true }" :leftWidth="'20%'">
    <template v-slot:header></template>
    <template v-slot:center>
      <el-form>
        <el-radio-group v-model="activeTab">
          <el-radio-button label="database">数据库</el-radio-button>
          <el-radio-button label="docSchemas">文档内容定义</el-radio-button>
          <el-radio-button label="dbSchemas">数据库属性定义</el-radio-button>
          <el-radio-button label="colSchemas">集合属性定义</el-radio-button>
          <el-radio-button label="tag">标签</el-radio-button>
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
      <el-table v-show="activeTab === 'docSchemas'" :data="documentSchemas" stripe style="width: 100%">
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"> </el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index, true)">复制</el-button>
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index)">修改</el-button>
            <el-button type="text" size="mini" @click="handleSchema(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-table v-show="activeTab === 'dbSchemas'" :data="dbSchemas" stripe style="width: 100%">
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"> </el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index, true)">复制</el-button>
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index)">修改</el-button>
            <el-button type="text" size="mini" @click="handleSchema(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-table v-show="activeTab === 'colSchemas'" :data="collectionSchemas" stripe style="width: 100%">
        <el-table-column prop="title" label="名称" width="180"></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index, true)">复制</el-button>
            <el-button type="text" size="mini" @click="editSchema(scope.row, scope.$index)">修改</el-button>
            <el-button type="text" size="mini" @click="handleSchema(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-table v-show="activeTab === 'tag'" :data="tags" stripe style="width: 100%">
        <el-table-column prop="name" label="名称"></el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="handleTag(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
    <template v-slot:right>
      <el-button @click="createDb" v-if="activeTab === 'database'">添加数据库</el-button>
      <el-button @click="createSchema('document')" v-if="activeTab === 'docSchemas'">添加文档列定义</el-button>
      <el-button @click="createSchema('db')" v-if="activeTab === 'dbSchemas'">添加数据库属性定义</el-button>
      <el-button @click="createSchema('collection')" v-if="activeTab === 'colSchemas'">添加集合属性定义</el-button>
      <el-button @click="createTag" v-if="activeTab === 'tag'">添加标签</el-button>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { mapState, mapMutations, mapActions } from 'vuex'
import { Frame } from 'tms-vue-ui'
Vue.use(Frame)

import DbEditor from '../components/DbEditor.vue'
import SchemaEditor from '../components/SchemaEditor.vue'
import TagEditor from '../components/TagEditor.vue'

export default {
  name: 'Home',
  props: ['bucketName'],
  data() {
    return {
      activeTab: 'database'
    }
  },
  computed: {
    ...mapState(['dbs', 'documentSchemas', 'dbSchemas', 'collectionSchemas', 'tags'])
  },
  methods: {
    ...mapMutations([
      'appendDatabase',
      'updateDatabase',
      'appendSchema',
      'updateSchema',
      'appendTag',
      'updateTag'
    ]),
    ...mapActions(['listDatabase', 'removeDb', 'listSchema', 'removeSchema', 'listTag', 'removeTag']),
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
  },
  mounted() {
    this.listDatabase({ bucket: this.bucketName })
    this.listSchema({ bucket: this.bucketName, scope: 'document' })
    this.listSchema({ bucket: this.bucketName, scope: 'db' })
    this.listSchema({ bucket: this.bucketName, scope: 'collection' })
    this.listTag({ bucket: this.bucketName })
  }
}
</script>
