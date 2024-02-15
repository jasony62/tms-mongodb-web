<template>
  <div id="x-spreadsheet" class="h-full w-full"></div>
</template>
<style>
/* 解决toolbar的padding作为宽度的问题 */
#x-spreadsheet .x-spreadsheet-toolbar {
  box-sizing: content-box;
}
</style>
<script setup lang="ts">
import { onMounted } from 'vue'
import Spreadsheet from "x-data-spreadsheet"
import zhCN from 'x-data-spreadsheet/src/locale/zh-cn'
import * as jsondiffpatch from 'jsondiffpatch'
import apiSS from '@/apis/spreadsheet'
1
const props = defineProps(['bucketName', 'dbName'])
const { bucketName, dbName } = props

Spreadsheet.locale('zh-cn', zhCN)

let xs: any = null
let savedSpreadsheet: any = null
const WaitSaveTime = 500 // 等待500毫秒未更新数据自动保存
let saveTimer: any = null

async function initSpreadsheet(data = []) {
  const elWrap = document.querySelector('#x-spreadsheet')
  if (!elWrap) return
  xs = new Spreadsheet('#x-spreadsheet', {
    showToolbar: true, showGrid: true, view: {
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
  if (savedSpreadsheet && editingData) {
    const { ver, data } = savedSpreadsheet
    const delta = jsondiffpatch.diff(data ?? [], editingData)
    if (!delta) return
    const newSS = await apiSS.save(bucketName, dbName, savedSpreadsheet._id, ver, delta)
    savedSpreadsheet.ver = newSS.ver
    savedSpreadsheet.data = JSON.parse(JSON.stringify(newSS.data))
  }
}

onMounted(async () => {
  const existed = await apiSS.list(bucketName, dbName)
  if (Array.isArray(existed)) {
    if (existed.length === 0) {
      const newSS = await apiSS.create(bucketName, dbName)
      savedSpreadsheet = newSS
      initSpreadsheet(JSON.parse(JSON.stringify(newSS.data)))
    } else if (existed.length === 1) {
      const ss = await apiSS.byId(bucketName, dbName, existed[0]._id)
      if (ss) {
        savedSpreadsheet = ss
        initSpreadsheet(ss.data ? JSON.parse(JSON.stringify(ss.data)) : [])
      }
    }
  }
})
</script>