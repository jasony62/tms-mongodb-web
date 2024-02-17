<template>
  <div class="flex flex-col gap-2 h-full">
    <!--header-->
    <div class="h-12 py-4 px-2">
      <el-breadcrumb :separator-icon="ArrowRight" v-if="EXTRACT === true">
        <el-breadcrumb-item>数据库</el-breadcrumb-item>
        <el-breadcrumb-item>{{ dbName }}</el-breadcrumb-item>
        <el-breadcrumb-item v-if="clName">{{ clName }}</el-breadcrumb-item>
      </el-breadcrumb>
      <el-breadcrumb :separator-icon="ArrowRight" v-else>
        <el-breadcrumb-item :to="{ name: 'databases' }">{{ DbLabel }}</el-breadcrumb-item>
        <el-breadcrumb-item v-if="!clName">{{ dbName }}</el-breadcrumb-item>
        <el-breadcrumb-item v-if="clName" :to="{ name: 'database', params: { dbName } }">{{ dbName }}</el-breadcrumb-item>
        <el-breadcrumb-item v-if="clName">{{ clName }}</el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <!--content-->
    <div class="flex flex-grow gap-2">
      <!--left-->
      <div id="x-spreadsheet" class="h-full" :class="COMPACT ? 'w-full' : 'w-4/5'"></div>
      <!--right-->
      <div class="flex flex-col items-start space-y-3" v-if="!COMPACT">
        <tmw-plugins :plugins="data.plugins" :handle-plugin="handlePlugin"></tmw-plugins>
      </div>
    </div>
  </div>
  <tmw-plugin-widget></tmw-plugin-widget>
</template>
<style>
/* 解决toolbar的padding作为宽度的问题 */
#x-spreadsheet .x-spreadsheet-toolbar {
  box-sizing: content-box;
}
</style>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import Spreadsheet from "x-data-spreadsheet"
//@ts-ignore
import zhCN from 'x-data-spreadsheet/src/locale/zh-cn'
import * as jsondiffpatch from 'jsondiffpatch'
import apiSS from '@/apis/spreadsheet'
import apiPlugin from '@/apis/plugin'
import { COMPACT_MODE, EXTRACT_MODE, FS_BASE_URL, LABEL, PushSocket } from '@/global'
import TmwPlugins from '@/components/PluginList.vue'
import TmwPluginWidget from '@/components/PluginWidget.vue'
import { useTmwPlugins } from '@/composables/plugins'
import { ElMessage } from 'element-plus'

const COMPACT = computed(() => COMPACT_MODE())
const EXTRACT = computed(() => EXTRACT_MODE())
const DbLabel = computed(() => LABEL('database', '数据库'))

const props = defineProps(['bucketName', 'dbName', 'clName'])
const { bucketName, dbName, clName } = props

const data = reactive({
  plugins: [] as any[],
})

Spreadsheet.locale('zh-cn', zhCN)

let xs: any = null
let latestSpreadsheet: any = null
const WaitSaveTime = 500 // 等待500毫秒未更新数据自动保存
let saveTimer: any = null

/**
 * 合并行数据
 * 
 * @param cells 
 * @param rIndex 
 * @param sIndex 
 */
function mergeCells(cells: any, rIndex: string, sIndex: string) {
  const cellIndexs = Object.keys(cells)
  for (const cIndex of cellIndexs) {
    let cellDelta = cells[cIndex]
    /**
     * cell有可能不存在
     */
    if (Array.isArray(cellDelta) && cellDelta.length === 1) {// 新增
      xs.cellText(rIndex, cIndex, cellDelta[0].text, sIndex)
    } else { // 修改
      let cell = xs.cell(rIndex, cIndex, sIndex)
      jsondiffpatch.patch(cell, cellDelta)
    }
  }
}
/**
 * 合并行列数据
 * 
 * @param rows 
 * @param sIndex 
 */
function mergeRows(rows: any, sIndex: string) {
  const rowIndexs = Object.keys(rows)
  for (const rIndex of rowIndexs) {
    let { cells } = rows[rIndex]
    if (typeof cells === 'object') {
      mergeCells(cells, rIndex, sIndex)
    }
  }
}
/**
 * 合并样式
 * x-spreadsheet没有提供设置样式的方法，所以，直接修改数据
 * @param styles 
 * @param sIndex 
 */
function mergeStyles(styles: any, sIndex: string | number) {
  if (typeof sIndex === 'string') sIndex = parseInt(sIndex)
  if (sIndex >= 0 && sIndex < xs.datas.length) {
    const sheetData = xs.datas[sIndex]
    if (sheetData) {
      jsondiffpatch.patch(sheetData.styles, styles)
    }
  }
}
/**
 * 合并表格变化数据
 * 
 * @param delta 
 */
function merge(delta: any) {
  const sheetIndexs = Object.keys(delta)
  for (const sIndex of sheetIndexs) {
    let sheet = delta[sIndex]
    if (typeof sheet === 'object') {
      let changed = false
      let { styles, rows } = sheet
      if (styles && typeof styles === 'object') {
        mergeStyles(styles, sIndex)
        changed = true
      }
      if (rows && typeof rows === 'object') {
        mergeRows(rows, sIndex)
        changed = true
      }
      if (changed) xs.reRender()
    }
  }
}
/**
 * 订阅表格数据变化消息
 * 
 * @param spreadsheetId 
 */
const changelogListener = (data: any) => {
  const { changelog } = data
  if (changelog) {
    const { delta } = changelog
    if (delta) merge(delta)
  }
}

async function subscribe(spreadsheetId: string) {
  const socket = await PushSocket()
  if (socket) {
    socket.on('tmw-spreadsheet-save', changelogListener)
    await apiSS.subscribe(spreadsheetId, socket.id)
  }
}

async function unsubscribe(spreadsheetId: string) {
  const socket = await PushSocket()
  if (socket) {
    socket.off('tmw-spreadsheet-save', changelogListener)
    await apiSS.unsubscribe(spreadsheetId, socket.id)
  }
}

async function initSpreadsheet(data = []) {
  const elWrap = document.querySelector('#x-spreadsheet')
  if (!elWrap) return
  xs = new Spreadsheet('#x-spreadsheet', {
    showToolbar: true, showGrid: true, showBottomBar: !clName, view: {
      height: () => elWrap!.clientHeight - 40,
      width: () => elWrap!.clientWidth,
    }
  }).loadData(data)
  xs.change((data: any) => {
    /**
     * 等待一段时间再提交修改数据，避免频繁提交
     */
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(save, WaitSaveTime)
    // }).on('cell-selected', (cell: any, ri: any, ci: any) => {
    //   console.log('cell-selected:cell:', cell, ', ri:', ri, ', ci:', ci);
    // }).on('cell-edited', (text: string, ri: number, ci: number) => {
    //   console.log('cell-edited:text:', text, ', ri: ', ri, ', ci:', ci);
  })
  // 解决修改sheet页名称事件
  document.querySelector('.x-spreadsheet-bottombar')?.addEventListener('change', (evt) => {
    const { target } = evt
    if (target) {
      //@ts-ignore
      const { tagName, value } = target
      if (tagName === 'INPUT') {
        let pe: any = target
        while (pe) {
          pe = pe.parentElement
          if (pe.tagName === 'LI') break
        }
        if (pe.tagName === 'LI' && pe.classList.contains('active')) {
          pe.parentNode.children
          for (let i = 0; i < pe.parentNode.children.length; i++) {
            if (pe === pe.parentNode.children[i]) {
              if (i > 0 && i <= xs.datas.length) {
                // 需要直接修改，xs.getData()返回的是新对象
                xs.datas[i - 1].name = value
                saveTimer = setTimeout(save, WaitSaveTime)
              }
              break
            }
          }
        }
      }
    }
  })
}
/**
 * 保存修改的数据
 */
const save = async () => {
  if (!xs) return
  if (saveTimer) saveTimer = null
  // 获得修改的数据
  let editingData = xs.getData()
  if (latestSpreadsheet && editingData) {
    const { ver, data } = latestSpreadsheet
    const delta = jsondiffpatch.diff(data ?? [], editingData)
    if (!delta) return
    //@ts-ignore
    delete delta._t
    const newSS = await apiSS.save(bucketName, dbName, latestSpreadsheet._id, ver, delta)
    latestSpreadsheet.ver = newSS.ver
    latestSpreadsheet.data = JSON.parse(JSON.stringify(newSS.data))
  }
}
/**
 * 
 * @param plugin 
 * @param docScope 
 * @param widgetResult 
 * @param widgetHandleResponse 
 * @param widgetDefaultHandleResponseRequired 
 * @param applyAccessTokenField 
 */
function onExecute(
  plugin: any,
  docScope = '',
  widgetResult = undefined,
  widgetHandleResponse = false,
  widgetDefaultHandleResponseRequired = false,
  applyAccessTokenField = ''
) {
  const postBody: any = {}
  if (widgetResult) {
    postBody.widget = widgetResult
  }
  // 插件执行的基础参数
  let queryParams = {
    bucket: bucketName ?? '',
    db: dbName,
    cl: clName,
    plugin: plugin.name,
  }
  // 执行插件方法
  return apiPlugin.execute(queryParams, postBody).then((result: any) => {
    if (typeof result.url === 'string') {
      /**下载文件*/
      let url = FS_BASE_URL() + result.url
      window.open(url)
    }

    ElMessage.success({
      message: `插件[${plugin.title}]执行完毕。`,
      showClose: true,
    })

    return 'ok'
  })
}
/**
 * 插件
 */
const { handlePlugin } = useTmwPlugins({
  bucketName,
  dbName,
  clName,
  onExecute,
  onCreate: (plugin: any, msg: any) => {
  },
  onClose: () => {
  },
})

onMounted(async () => {
  const existed = await apiSS.list(bucketName, dbName, clName)
  if (Array.isArray(existed)) {
    if (existed.length === 0) {
      const newSS = await apiSS.create(bucketName, dbName, clName)
      latestSpreadsheet = newSS
    } else if (existed.length === 1) {
      const ss = await apiSS.byId(bucketName, dbName, existed[0]._id)
      if (ss) {
        latestSpreadsheet = ss
      }
    }
    if (latestSpreadsheet) {
      const { data } = latestSpreadsheet
      initSpreadsheet(data ? JSON.parse(JSON.stringify(data)) : [])
      subscribe(latestSpreadsheet._id)
    }
  }
  if (dbName) {
    if (clName) {
      data.plugins = await apiPlugin.getCollectionDocPlugins(
        bucketName,
        dbName,
        clName,
        true
      )
    } else {
      data.plugins = await apiPlugin.getCollectionPlugins(
        bucketName, dbName, true
      )
    }
  }
})
onUnmounted(async () => {
  unsubscribe(latestSpreadsheet._id)
})
</script>