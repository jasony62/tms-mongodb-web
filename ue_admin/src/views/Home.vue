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
          <el-radio-button label="schema">集合列定义</el-radio-button>
        </el-radio-group>
      </el-form>
      <el-table
        v-show="activeTab === 'database'"
        :data="dbs"
        stripe
        style="width: 100%"
      >
        <el-table-column label="数据库" width="180">
          <template slot-scope="scope">
            <router-link
              :to="{ name: 'database', params: { dbName: scope.row.name } }"
              >{{ scope.row.name }}</router-link
            >
          </template>
        </el-table-column>
        <el-table-column
          prop="title"
          label="名称"
          width="180"
        ></el-table-column>
        <el-table-column prop="description" label="说明"></el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editDb(scope.row)"
              >修改</el-button
            >
            <el-button type="text" size="mini" @click="handleDb(scope.row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
      <el-table
        v-show="activeTab === 'schema'"
        :data="schemas"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="title" label="名称" width="180">
        </el-table-column>
        <el-table-column prop="description" label="说明"> </el-table-column>
        <el-table-column fixed="right" label="操作" width="120">
          <template slot-scope="scope">
            <el-button type="text" size="mini" @click="editSchema(scope.row)"
              >修改</el-button
            >
            <el-button type="text" size="mini" @click="handleSchema(scope.row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </template>
    <template v-slot:right>
      <el-button @click="createDb" v-if="activeTab === 'database'"
        >添加数据库</el-button
      >
      <el-button @click="createSchema" v-if="activeTab === 'schema'"
        >添加集合列定义</el-button
      >
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
  data() {
    return {
      activeTab: 'database'
    }
  },
  computed: {
    ...mapState(['dbs', 'schemas'])
  },
  methods: {
    ...mapMutations([
      'appendDatabase',
      'updateDatabase',
      'appendSchema',
      'updateSchema'
    ]),
    ...mapActions([
      'listDatabase',
      'removeDb',
      'listSchema',
      'removeSchema'
    ]),
    createDb() {
      const editor = new Vue(DbEditor)
      editor.open('create').then(newDb => {
        this.appendDatabase({db: newDb})
      })
    },
    editDb(db) {
      const editor = new Vue(DbEditor)
      editor.open('update', db).then(newDb => {
        Object.keys(newDb).forEach(k => {
          Vue.set(db, k, newDb[k])
        })
        this.updateDatabase({db: newDb})
      })
    },
    handleDb(db) {
      this.$customeConfirm('数据库', () => {
        return this.removeDb({db})
      })
    },
    createSchema() {
      const editor = new Vue(SchemaEditor)
      editor.open('create').then(newSchema => {
        this.appendSchema({schema: newSchema})
      })
    },
    editSchema(schema) {
      const editor = new Vue(SchemaEditor)
      editor.open('update', schema).then(newSchema => {
        Object.keys(newSchema).forEach(k => {
          this.$set(schema, k, newSchema[k])
        })
        this.updateSchema({schema: newSchema})
      })
    },
    handleSchema(schema) {
      this.$customeConfirm('列定义', () => {
        return this.removeSchema({schema})
      })
    },
  },
  mounted() {
    this.listDatabase()
    this.listSchema()
  }
}
</script>
