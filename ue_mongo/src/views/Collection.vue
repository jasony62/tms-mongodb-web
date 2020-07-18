<template>
  <tms-frame :display="{ header: true, footer: false, right: true }" :leftWidth="'20%'">
    <template v-slot:header>
      <el-breadcrumb separator-class="el-icon-arrow-right">
        <el-breadcrumb-item :to="{ name: 'home' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ name: 'database', params: { dbName: dbName } }">{{dbName}}</el-breadcrumb-item>
        <el-breadcrumb-item>{{clName}}</el-breadcrumb-item>
      </el-breadcrumb>
    </template>
    <template v-slot:center>
      <div id="collection"></div>
    </template>
    <template v-slot:right>
      <tms-flex direction="column" align-items="flex-start">
        <div>
          <el-button @click="createDocument">添加数据</el-button>
        </div>
        <el-dropdown @command="batchEditDocument">
          <el-button>批量修改<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <el-upload action="#" :show-file-list="false" :http-request="importDocument">
          <el-button>导入数据</el-button>
        </el-upload>
        <el-dropdown @command="exportDocument">
          <el-button>导出数据<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <el-dropdown @command="batchRemoveDocument">
          <el-button>批量删除<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <hr />
        <el-checkbox-group v-model="moveCheckList" v-if="plugins.document.transforms&&plugins.document.transforms.move">
          <el-checkbox v-for="(t, k) in plugins.document.transforms.move" :label="t.name" :key="k">{{t.label}}</el-checkbox>
        </el-checkbox-group>
        <el-dropdown @command="batchMoveDocument">
          <el-button>数据迁移<i class="el-icon-arrow-down el-icon--right"></i></el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="all" :disabled="totalByAll==0">按全部({{totalByAll}})</el-dropdown-item>
            <el-dropdown-item command="filter" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-dropdown-item>
            <el-dropdown-item command="checked" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <hr />
        <div v-for="s in plugins.document.submits" :key="s.id">
          <el-checkbox-group v-model="s.checkList" v-if="plugins.document.transforms&&plugins.document.transforms[s.id]">
            <el-checkbox v-for="(t, k) in plugins.document.transforms[s.id]" :label="t.name" :key="k">{{t.label}}</el-checkbox>
          </el-checkbox-group>
          <el-button @click="handlePlugin(s, null)" v-if="!s.batch">{{s.name}}</el-button>
          <el-dropdown v-if="s.batch">
            <el-button>{{s.name}}<i class="el-icon-arrow-down el-icon--right"></i></el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugin(s, 'all')" :disabled="totalByAll==0">按全部({{totalByAll}})</el-button>
              </el-dropdown-item>
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugin(s, 'filter')" :disabled="totalByFilter==0">按筛选({{totalByFilter}})</el-button>
              </el-dropdown-item>
              <el-dropdown-item>
                <el-button type="text" @click="handlePlugin(s, 'checked')" :disabled="totalByChecked==0">按选中({{totalByChecked}})</el-button>
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
          <hr v-if="plugins.document.transforms&&plugins.document.transforms[s.id]" />
        </div>
      </tms-flex>
    </template>
  </tms-frame>
</template>

<script>
import Vue from 'vue'
import { Frame, Flex } from 'tms-vue-ui'
Vue.use(Frame).use(Flex)
import { Breadcrumb, BreadcrumbItem, Upload, Dropdown, DropdownMenu, DropdownItem, Message, MessageBox } from 'element-ui'
Vue.use(Breadcrumb)
  .use(BreadcrumbItem)
  .use(Upload)
  .use(Dropdown)
  .use(DropdownMenu)
  .use(DropdownItem)
import DocEditor from '@/components/DocEditor.vue'
import ColumnValueEditor from '@/components/ColumnValueEditor.vue'
import DomainEditor from '@/components/DomainEditor.vue'
import MoveByRulePlugin from '@/plugins/move/Main.vue'
import apiPlugins from '@/plugins'
import createDocApi from '../apis/document'
 
export default {
  name: 'Collection',
  props: {
    bucketName: String,
    dbName: String,
    clName: String
  },
  data() {
    return {
      moveCheckList: [],
      plugins: { document: { submits: [], transforms: {} } },
      totalByAll: null,
      totalByFilter: null,
      totalByChecked: null
    }
  },
  watch: {
    filter: {
      handler: function (val) {
        this.totalByAll = Object.keys(val).length ? 0 : this.page.total
        this.totalByFilter = Object.keys(val).length ? this.page.total : 0
      }
    },
    multipleDocuments: function(val) {
      this.totalByChecked = val.length
    }
  },
  methods: {
    createDocument() {
      let editor = new Vue(DocEditor)
      editor.open(this.tmsAxiosName, this.bucketName, this.dbName, this.collection).then(() => {
        this.listDocument()
      })
    },
    fnSetReqParam(command, checkList) {
      let param, transforms
      param = {}
      transforms = checkList && checkList.join(',')
      switch (command) {
        case 'all':
          param.filter = 'ALL'
          break
        case 'filter':
          param.filter = this.handleCondition().filter
          this.filter = param.filter
          break
        case 'checked':
          param.docIds = this.multipleDocuments.map(document => document._id)
          break
      }
      return { param: param, transforms: transforms }
    },
    batchEditDocument(command) {
      let { param } = this.fnSetReqParam(command),
        editor
      editor = new Vue(ColumnValueEditor)
      editor.open(this.collection).then(columns => {
        Object.assign(param, { columns })
        createDocApi(this.TmsAxios(this.tmsAxiosName))
          .batchUpdate(
            this.bucketName,
            this.dbName,
            this.collection.name,
            param
          )
          .then(result => {
            Message.success({ message: '已成功修改' + result.n + '条' })
            this.listDocument()
          })
      })
    },
    batchRemoveDocument(command) {
      let { param } = this.fnSetReqParam(command)
      MessageBox({
        title: '提示',
        message: '确定删除这些数据？',
        confirmButtonText: '确定',
        type: 'warning'
      })
        .then(() => {
          createDocApi(this.TmsAxios(this.tmsAxiosName))
            .batchRemove(this.bucketName, this.dbName, this.clName, param)
            .then(result => {
              Message.success({ message: '已成功删除' + result.n + '条' })
              this.fnHandleResResult(result, true)
            })
        })
        .catch(() => {})
    },
    fnMoveDocument(
      dbName,
      clName,
      transforms,
      param,
      pTotal,
      aMTotal,
      aMPTotal
    ) {
      let msg = Message.info({ message: '开始迁移数据...', duration: 0 }),
        _this = this
      async function fnmove(
        dbName,
        clName,
        transforms,
        param,
        pTotal,
        aMTotal,
        aMPTotal
      ) {
        let result = await createDocApi(_this.TmsAxios(_this.tmsAxiosName))
          .move(
            _this.bucketName,
            _this.dbName,
            _this.clName,
            dbName,
            clName,
            transforms,
            param,
            pTotal,
            aMTotal,
            aMPTotal
          )
          .catch(() => msg.close())
        if (result) {
          let {
            planTotal,
            alreadyMoveTotal,
            alreadyMovePassTotal,
            alreadyMoveFailTotal,
            spareTotal
          } = result
          msg.message = '正在迁移数据...'
          if (spareTotal <= 0) {
            msg.message =
              '成功迁移' +
              alreadyMovePassTotal +
              '条，失败' +
              alreadyMoveFailTotal +
              '条'
            setTimeout(() => msg.close(), 1000)
            return result
          }
          return fnmove(
            dbName,
            clName,
            transforms,
            param,
            planTotal,
            alreadyMoveTotal,
            alreadyMovePassTotal
          )
        }
      }
      return fnmove(
        dbName,
        clName,
        transforms,
        param,
        pTotal,
        aMTotal,
        aMPTotal
      )
    },
    batchMoveDocument(command) {
      let { param, transforms } = this.fnSetReqParam(
          command,
          this.moveCheckList
        ),
        confirm,
        config
      confirm = new Vue(DomainEditor)
      config = { title: '迁移到' }
      confirm.open(this.tmsAxiosName, this.bucketName, config).then(fields => {
        const { dbName, clName } = fields
        if (command === 'checked') {
          this.fnMoveDocument(dbName, clName, transforms, param, 0, 0, 0).then(
            result => {
              this.fnHandleResResult({ n: result.alreadyMovePassTotal }, true)
            }
          )
        } else {
          this.fnMoveDocument(dbName, clName, transforms, param, 0, 0, 0).then(
            () => {
              this.page.at = 1
              this.listDocument()
            }
          )
        }
      })
    },
    importDocument(data) {
      let formData = new FormData()
      const msg = Message.info({ message: '正在导入数据...', duration: 0 })
      formData.append('file', data.file)
      createDocApi(this.TmsAxios(this.tmsAxiosName))
        .import(this.bucketName, this.dbName, this.clName, formData)
        .then(() => {
          this.listDocument()
          setTimeout(() => msg.close(), 1000)
        })
    },
    exportDocument(command) {
			let { param } = this.fnSetReqParam(command)
      createDocApi(this.TmsAxios(this.tmsAxiosName)).export(this.bucketName, this.dbName, this.clName, param).then(result => {
        const access_token = sessionStorage.getItem('access_token')
        window.open(
          `${process.env.VUE_APP_BACK_API_FS}${result}?access_token=${access_token}`
        )
      })
		},
    pluginOfMoveByRule(transforms) {
      let confirm, config
      confirm = new Vue(DomainEditor)
      config = { title: '选定规则表' }
      confirm.open(this.tmsAxiosName, this.bucketName, config).then(fields => {
        const { dbName: ruleDbName, clName: ruleClName } = fields
        let moveByRule = new Vue(MoveByRulePlugin)
        moveByRule.showDialog(
          this.dbName,
          this.clName,
          ruleDbName,
          ruleClName,
          transforms
        )
      })
    },
    pluginOfSync(type, transforms, param, pTotal, aSTotal, aSPTotal) {
      let msg = Message.info({ message: '开始同步数据...', duration: 0 }),
        _this = this
      async function fnsync(type, transforms, param, pTotal, aSTotal, aSPTotal) {
        let {
          planTotal,
          alreadySyncTotal,
          alreadySyncPassTotal,
          alreadySyncFailTotal,
          spareTotal
        } = await apiPlugins.sync[type](
            _this.dbName,
            _this.clName,
            transforms,
            param,
            pTotal,
            aSTotal,
            aSPTotal
          )
          .catch(() => msg.close())
        msg.message = '正在同步数据...'
        if (spareTotal <= 0) {
          msg.message = '成功同步' + alreadySyncPassTotal + '条，失败' + alreadySyncFailTotal + '条'
          _this.listDocument()
          setTimeout(() => msg.close(), 1500)
          return false
        }
        fnsync(type, transforms, param, planTotal, alreadySyncTotal, alreadySyncPassTotal)
      }
      fnsync(type, transforms, param, pTotal, aSTotal, aSPTotal)
    },
    handlePlugin(submit, type) {
      let transforms = submit.checkList ? submit.checkList.join(',') : ""
      let { param } = type ? this.fnSetReqParam(type) : { param: null }
      switch (submit.id) {
        case 'moveByRule':
          this.pluginOfMoveByRule(transforms, param)
          break
        case 'syncMobilePool':
        case 'syncToPool':
				case 'syncToWork':
          this.pluginOfSync(submit.id, transforms, param, 0, 0, 0)
      }
    },
    listPlugin() {
      apiPlugins.plugin.list().then(plugins => {
        if (JSON.stringify(plugins) !== '{}') {
					if (plugins.document.transforms) {
						this.moveCheckList = plugins.document.transforms.move.map(option => option.name)
						plugins.document.submits.forEach(submit => {
							let transforms = plugins.document.transforms[submit.id]
							submit.checkList = transforms ? transforms.map(item => item.name) : []
						})
					}
          this.plugins = plugins
        }
      })
    },
  },
  mounted() {
    this.listPlugin()
    import('../../../ue_comp/src/List.vue').then(Module => {
      Module.createAndMount(Vue, {
        bucketName: this.bucketName,
        dbName: this.dbName,
        clName: this.clName,
        tmsAxiosName: 'mongodb-api'
      }, 'collection')
    })
  }
}
</script>
