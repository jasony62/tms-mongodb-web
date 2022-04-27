<template>
  <tms-frame class="tmw-collection" :display="{ header: true, footer: true, right: true }" :leftWidth="'20%'">
    <template v-slot:header>
      <el-breadcrumb :separator-icon="ArrowRight">
        <el-breadcrumb-item :to="{ name: 'home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'database', params: { dbName: dbName } }">{{ dbName }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{ clName }}</el-breadcrumb-item>
      </el-breadcrumb>
    </template>
    <template v-slot:center>
      <el-table :data="store.documents" highlight-current-row style="width: 100%;" :max-height="dymaicHeight" @current-change="handleCurrentChange">
        <el-table-column type="index" width="55"></el-table-column>
        <el-table-column v-for="(s, k) in data.properties" :key="k" :prop="k">
          <template #header>
            <i v-if="s.required" style="color: red">*</i>
            <span>{{ s.title }}</span>
            <!-- <img src="../assets/icon_filter.png" class="icon_filter" @click="handleSelect(s, k)" /> -->
          </template>
          <template #default="scope">
            <span v-if="s.type === 'boolean'">{{scope.row[k] ? '是' : '否'}}</span>
            <span v-else-if="s.type === 'array' && s.items && s.items.format === 'file'">
              <span v-for="(i, v) in scope.row[k]" :key="v">
                <a href="#" @click="downLoadFile(i)">{{ i.name }}</a>
                <br />
              </span>
            </span>
            <span v-else-if="s.type === 'array' && s.enum && s.enum.length">
              <span v-if="s.enumGroups && s.enumGroups.length">
                <span v-for="(g, i) in s.enumGroups" :key="i">
                  <span v-if="scope.row[g.assocEnum.property] === g.assocEnum.value">
                    <span v-for="(e, v) in s.enum" :key="v">
                      <span v-if="e.group === g.id && scope.row[k] && scope.row[k].length && scope.row[k].includes(e.value)">{{ e.label }}&nbsp;</span>
                    </span>
                  </span>
                </span>
              </span>
              <span v-else>
                <span v-for="(i, v) in s.enum" :key="v">
                  <span v-if="scope.row[k] && scope.row[k].includes(i.value)">{{ i.label }}&nbsp;</span>
                </span>
              </span>
            </span>
            <span v-else-if="s.type === 'string' && s.enum && s.enum.length">
              <span v-if="s.enumGroups && s.enumGroups.length">
                <span v-for="(g, i) in s.enumGroups" :key="i">
                  <span v-if="scope.row[g.assocEnum.property] === g.assocEnum.value">
                    <span v-for="(e, v) in s.enum" :key="v">
                      <span v-if="e.group === g.id && scope.row[k] === e.value">{{ e.label }}</span>
                    </span>
                  </span>
                </span>
              </span>
              <span v-else>
                <span v-for="(i, v) in s.enum" :key="v">
                  <span v-if="scope.row[k] === i.value">{{ i.label }}</span>
                </span>
              </span>
            </span>
            <span v-else>{{ scope.row[k] }}</span>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="180">
          <template #default="scope">
            <el-button size="small" @click="editDocument(scope.row)">修改</el-button>
            <el-button size="small" @click="removeDocument(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <tms-flex class="tmw-pagination">
        <span class="tmw-pagination__text">已选中 {{ data.multipleDoc.length }} 条数据</span>
        <el-pagination layout="total, sizes, prev, pager, next" background :total="data.docBatch.total" :page-sizes="[10, 25, 50, 100]" :current-page="data.docBatch.page" :page-size="data.docBatch.size" @current-change="changeDocPage" @size-change="changeDocSize"></el-pagination>
      </tms-flex>
    </template>
    <template v-slot:right>
      <tms-flex direction="column" align-items="flex-start">
        <div>
          <el-button @click="createDocument">添加文档</el-button>
        </div>
        <div v-if="data.jsonItems.length">
          <el-button v-if="data.jsonItems.length === 1" plain @click="configJson(data.jsonItems[0])">编辑【{{ data.jsonItems[0].title }}】
          </el-button>
          <el-dropdown v-else>
            <el-button>配置json类型<i class="el-icon-arrow-down el-icon--right"></i></el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item v-for="(item, index) in data.jsonItems" :key="index">
                <el-button type="text" @click="configJson(item)">编辑【{{ item.title }}】</el-button>
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </tms-flex>
    </template>
  </tms-frame>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowRight } from '@element-plus/icons-vue'
import { Batch } from 'tms-vue3'

import apiCollection from '@/apis/collection'
import apiSchema from '@/apis/schema'
import apiDoc from '@/apis/document'

import facStore from '@/store'
import { openConfigJsonEditor } from '@/components/editor'

const store = facStore()

// 查找条件下拉框分页包含记录数
const LIST_DB_PAGE_SIZE = 100

const dymaicHeight = ref(500)
let currentRow = ref()
let collection = reactive({
  schema_tags: [] as any[],
  schema_default_tags: [] as any[],
  schema: {
    body: { properties: {} },
  },
})
const props = defineProps({
  bucketName: { type: String, defalut: '' },
  dbName: { type: String, default: '' },
  clName: { type: String, default: '' },
})
const { bucketName, dbName, clName } = props

const data = reactive({
  docBatch: new Batch(() => {}),
  multipleDoc: [] as any[],
  jsonItems: [] as any[],
  properties: {} as any,
  documents: [] as any[],
})

const hasJsonItems = () => {
  for (let propertyName in data.properties) {
    let value = data.properties[propertyName]
    if (value.type === 'json') {
      // 自定义name键值接收原property
      value.name = propertyName
      data.jsonItems.push(value)
    }
  }
}

const configJson = (item: any) => {
  if (currentRow && Object.keys(currentRow).length) {
    let value = currentRow.value[item.name]
    openConfigJsonEditor({
      jsonData: value,
      onBeforeClose: (newJson?: any) => {
        currentRow.value[item.name] = newJson
        apiDoc
          .update(
            bucketName,
            dbName,
            clName,
            currentRow.value._id,
            currentRow.value
          )
          .then(() => {
            listDocByKw()
          })
      },
    })
  } else {
    ElMessage.info({ message: '请选择要配置的数据' })
  }
}

const handleCurrentChange = (val: any) => {
  currentRow.value = val
}

const createDocument = () => {
  console.log('添加文档')
}

const editDocument = (document: any) => {
  console.log('编辑文档')
}

const removeDocument = (document: any) => {
  ElMessageBox.confirm(`是否确认要删除当前数据?`, {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      store
        .removeDocument({
          bucket: bucketName,
          db: dbName,
          cl: clName,
          document: document,
        })
        .then(() => {
          ElMessage({ message: '删除成功', type: 'success' })
          listDocByKw()
        })
    })
    .catch(() => {})
}

const downLoadFile = (file: any) => {
  //const access_token = this.$getToken()
  //window.open(`${file.url}?access_token=${access_token}`)
}

const changeDocPage = (page: number) => {
  data.docBatch.goto(page)
}

const changeDocSize = (size: number) => {
  data.docBatch.size = size
  data.docBatch.goto(1)
}

const listTag = (tags: any) => {
  let temp = {}
  const arrPromise = tags.map((item: string) =>
    apiSchema.listByTag(bucketName, item)
  )
  return Promise.all(arrPromise)
    .then((res) => {
      res.forEach((schemas: any) => {
        schemas.forEach((schema: any) => {
          temp = { ...temp, ...schema.body.properties }
        })
      })
      return temp
    })
    .catch((err) => {
      throw new Error(err)
    })
}

const handleProperty = async () => {
  let temp = {}
  let properties = collection.schema.body.properties

  if (collection.schema_default_tags && collection.schema_default_tags.length) {
    temp = await listTag(collection.schema_default_tags)
  } else if (collection.schema_tags && collection.schema_tags.length) {
    temp = await listTag(collection.schema_tags)
  } else if (
    properties &&
    Object.prototype.toString.call(properties).toLowerCase() ==
      '[object object]'
  ) {
    Object.assign(temp, properties)
  }

  data.properties = Object.freeze(temp)
}

const listDocByKw = () => {
  data.docBatch = store.listDocument({
    bucket: bucketName,
    db: dbName,
    cl: clName,
    size: LIST_DB_PAGE_SIZE,
  })
}

onMounted(async () => {
  let { bucketName, dbName, clName } = props
  collection = await apiCollection.byName(bucketName, dbName, clName)
  await handleProperty()
  hasJsonItems()
  listDocByKw()
})
</script>

<style>
.tms-frame__main__center {
  width: calc(75% - 16px);
  background-color: #f0f3f6 !important;
}
</style>