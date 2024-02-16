import { PluginProfileScope, PluginProfileAmount } from 'tmw-data'
import { loadConfig, ModelDb, ModelSpreadsheet, exportJSON } from 'tmw-kit'
import { PluginBase } from 'tmw-kit/dist/plugin/index.js'
import { LocalFS } from 'tms-koa/dist/model/fs/local.js'
import path from 'path'
import _ from 'lodash'
import fs from 'fs'

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址
const ConfigFile =
  process.env.TMW_PLUGIN_CL_SPREADSHEET_EXPORT_CONFIG_NAME ||
  './plugin/cl/spreadsheet_export'

/**
 * 将集合中的文档数据导出为json或者excel文件
 */
class DbSpreadsheetExportPlugin extends PluginBase {
  constructor(file: string) {
    super(file)
    this.name = 'cl-spreadsheet-export'
    this.title = '导出表格'
    this.description = '在自由表格中，将文档按JSON或者EXCEL格式导出。'
    this.scope = PluginProfileScope.collection
    this.amount = PluginProfileAmount.zero
    this.beforeWidget = { name: 'external', url: '', size: '40%' }
  }
  /**
   * 获得集合对应的表格数据
   *
   * @param ctrl
   * @param tmwCl
   * @returns
   */
  async _getSpreadsheetData(ctrl, dbSysname) {
    const modelSc = new ModelSpreadsheet(
      ctrl.mongoClient,
      ctrl.bucket,
      ctrl.client
    )
    const [isOk, data] = await modelSc.list(dbSysname)
    if (!isOk) return [isOk, data]
    if (Array.isArray(data) && data.length === 1) {
      return await modelSc.byId(dbSysname, data[0]._id.toString())
    }
    return [false, '指定的集合没有表格数据']
  }
  /**
   *
   * @param ctrl
   * @returns
   */
  async execute(ctrl: any) {
    const dbName = ctrl.request.query.db
    const modelDb = new ModelDb(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const existDb = await modelDb.byName(dbName)
    if (!existDb) return { code: 10001, msg: `数据库【${dbName}】不存在` }

    const [ok, sheets] = await this._getSpreadsheetData(ctrl, existDb.sysname)
    if (ok === false) return { code: 10001, msg: sheets }
    /**文档导出文件*/
    const fsContext = ctrl.tmsContext.FsContext.insSync()
    const domain = fsContext.getDomain(fsContext.defaultDomain)

    const tmsFs = new LocalFS(ctrl.tmsContext, domain.name)

    // 文件名同时也做为目录名
    let filePath = tmsFs.pathWithRoot(dbName)

    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { recursive: true })
    }
    fs.mkdirSync(filePath, { recursive: true })

    let { outType } = ctrl.request.body.widget
    let relativeUrl, url
    if (outType === 'excel') {
      const XLSX = await import('xlsx')

      filePath = path.join(filePath, `${dbName}.xlsx`)

      const wb = XLSX.utils.book_new()
      sheets.data.forEach((sheet) => {
        const aoa = [] // 将表格的json数据转换为二维数组
        const { name, rows } = sheet
        Object.entries(rows).forEach(([key, row]: [string, any]) => {
          // rows中有len字段
          if (!row || typeof row !== 'object') return
          let rIndex = parseInt(key)
          // 补充空行
          for (let y = rIndex - aoa.length + 1; y > 0; y--) aoa.push([])
          let a = aoa[rIndex] // 记录表格中的一行数据
          let { cells } = row
          Object.entries(cells).forEach(([key, cell]: [string, any]) => {
            let cIndex = parseInt(key)
            // 补充空列
            for (let x = cIndex - aoa.length + 1; x > 0; x--) a.push('')
            a[cIndex] = cell.text
          })
        })
        const ws = XLSX.utils.aoa_to_sheet(aoa)
        XLSX.utils.book_append_sheet(wb, ws, name)
      })
      XLSX.writeFile(wb, filePath)
      // 文件地址
      relativeUrl = tmsFs.pathWithPrefix(path.join(dbName, `${dbName}.xlsx`))
    } else if (outType === 'json') {
      exportJSON(ctrl.tmsContext, domain.name, sheets, `${dbName}.zip`, {
        dir: dbName,
      })
      // 文件地址
      relativeUrl = tmsFs.pathWithPrefix(path.join(dbName, `${dbName}.zip`))
    }
    if (relativeUrl) {
      let appContext = ctrl.tmsContext.AppContext.insSync()
      url = `${appContext.router?.fsdomain?.prefix ?? ''}/${relativeUrl}`
    }

    return { code: 0, msg: { url } }
  }
}

export async function createPlugin(file: string) {
  let config
  if (ConfigFile) config = await loadConfig(ConfigDir, ConfigFile)
  if (config && typeof config === 'object') {
    let {
      widgetUrl,
      bucket,
      db,
      cl,
      schema,
      title,
      disabled,
      spreadsheet,
      dbBlacklist,
      clBlacklist,
      schemaBlacklist,
    } = config
    const newPlugin = new DbSpreadsheetExportPlugin(file)
    newPlugin.beforeWidget.url = widgetUrl

    if (bucket) newPlugin.bucketName = new RegExp(bucket)
    if (db) newPlugin.dbName = new RegExp(db)
    if (cl) newPlugin.clName = new RegExp(cl)
    if (schema) newPlugin.schemaName = new RegExp(schema)

    if (title && typeof title === 'string') newPlugin.title = title

    if (disabled) newPlugin.disabled = disabled
    if (spreadsheet) newPlugin.spreadsheet = spreadsheet
    if (dbBlacklist) newPlugin.dbBlacklist = new RegExp(dbBlacklist)
    if (clBlacklist) newPlugin.clBlacklist = new RegExp(clBlacklist)
    if (schemaBlacklist) newPlugin.schemaBlacklist = new RegExp(schemaBlacklist)

    return newPlugin
  }

  return false
}
