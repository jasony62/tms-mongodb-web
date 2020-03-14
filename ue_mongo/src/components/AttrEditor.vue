<template>
  <el-form class="tms-form" :model="doc" label-width="100px" size="mini">
    <el-form-item v-for="(e, k) in collection.body.properties" :key="k" :label="e.title">
      <el-input v-model="doc[k]"></el-input>
    </el-form-item>
  </el-form>
</template>
<script>
import Vue from 'vue'
import { Form, FormItem, Input } from 'element-ui'
Vue.use(Form)
  .use(FormItem)
  .use(Input)

export default {
  name: 'TmsAttrEditor',
  props: {
    id: String,
    schemas: Array,
    doc: Object
  },
  data() {
    return {
      collection: { body: { properties: {} } }
    }
  },
  watch: {
    id(newId) {
      Object.keys(this.doc).forEach(k => {
        delete this.doc[k]
      })
      this.schemas.forEach(schema => {
        if (schema._id===newId) {
          this.collection = schema
          if (schema.body.properties) {
            let properties = schema.body.properties
            Object.keys(properties).forEach(k => {
              Vue.set(this.doc, k, "")
            })
          }
        }
      })
    },
    schemas(schemas) {
      if (this.id) {
        schemas.forEach(schema => {
          if (schema._id===this.id) this.collection = schema
        })
      }
    }
  },
}
</script>
<style lang="less">
.tms-form {
  padding: 10px;
  background: #f5f5f5;
  box-sizing: border-box;

  .el-form-item__label {
    float: left
  }
}
</style>