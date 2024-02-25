import { PluginProfileScope, PluginProfileAmount } from 'tmw-data'
import {
  loadConfig,
  ModelSpreadsheet,
  ModelSchema,
  ModelDoc,
  ModelDb,
  SchemaIter,
  exportJSON,
  createDocWebhook,
} from 'tmw-kit'
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
  process.env.TMW_PLUGIN_DOC_SPREADSHEET_EXPORT_CONFIG_NAME ||
  './plugin/doc/spreadsheet_export'

function findSysColl(ctrl, existDb, clName) {
  let { mongoClient } = ctrl
  let sysCl = mongoClient.db(existDb.sysname).collection(clName)

  return sysCl
}
/**
 * 添加文档
 *
 * @param ctrl
 * @param existDb
 * @param clSysname
 * @param rowsJson
 * @returns
 */
async function createDocuments(ctrl, existDb, clSysname, rowsJson) {
  const modelDoc = new ModelDoc(ctrl.mongoClient, ctrl.bucket, ctrl.client)
  const docWebhook = createDocWebhook(process.env.TMW_APP_WEBHOOK)

  let finishRows = rowsJson.map((row) => {
    let newRow: any = {}
    for (let k in row) {
      let oneRow = _.get(row, k)
      if (typeof oneRow === 'number') oneRow = String(oneRow)
      _.set(newRow, k.split('.'), oneRow)
    }
    // 加工数据
    modelDoc.processBeforeStore(newRow, 'insert')

    return newRow
  })

  try {
    // 通过webhook处理数据
    let beforeRst: any = await docWebhook.beforeCreate(finishRows, existDb)

    if (beforeRst.passed !== true) throw Error('操作被Webhook.beforeCreate阻止')

    if (beforeRst.rewrited && typeof beforeRst.rewrited === 'object')
      finishRows = beforeRst.rewrited

    // 数据存储到集合中
    const rst = await findSysColl(ctrl, existDb, clSysname)
      .insertMany(finishRows)
      .then(async (r) => {
        await modelDoc.dataActionLog(r.ops, '创建', existDb.name, clSysname)
        return finishRows
      })

    // 通过webhook处理数据
    let afterRst: any = await docWebhook.afterCreate(rst, existDb)
    if (afterRst.passed !== true) throw Error('操作被Webhook.afterCreate阻止')
  } catch (error) {
    throw Error(error.message)
  }
}

type ExportFileInfoResult = {
  filePath: string
  fileName: string
  domain: any
  tmsFs: any
}
/**
 * 导出文件信息
 *
 * @param ctrl
 * @param tmwCl
 * @returns
 */
function getExportFileInfo(ctrl, tmwCl): ExportFileInfoResult {
  const fsContext = ctrl.tmsContext.FsContext.insSync()
  const domain = fsContext.getDomain(fsContext.defaultDomain)

  const tmsFs = new LocalFS(ctrl.tmsContext, domain.name)

  const { name: fileName } = tmwCl
  let filePath = tmsFs.pathWithRoot(fileName)

  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { recursive: true })
  }
  fs.mkdirSync(filePath, { recursive: true })

  return { filePath, fileName, domain, tmsFs }
}
/**
 * 导出为json文件
 *
 * @param ctrl
 * @param tmwCl
 * @param sheets
 * @returns
 */
async function exportAsJson(ctrl, tmwCl, sheets) {
  const { domain, tmsFs } = getExportFileInfo(ctrl, tmwCl)

  // 文件名同时也做为目录名
  const { name: fileName } = tmwCl
  exportJSON(ctrl.tmsContext, domain.name, sheets, `${fileName}.zip`, {
    dir: fileName,
  })
  // 文件地址
  let relativeUrl = tmsFs.pathWithPrefix(path.join(fileName, `${fileName}.zip`))
  return relativeUrl
}
/**
 * 导出到excel文件
 *
 * @param ctrl
 * @param tmwCl
 * @param sheets
 * @returns
 */
async function exportAsExcel(ctrl, tmwCl, sheets): Promise<string> {
  const XLSX = await import('xlsx')

  let { filePath, fileName, tmsFs } = getExportFileInfo(ctrl, tmwCl)

  filePath = path.join(filePath, `${fileName}.xlsx`)

  const aoa = [] // 将表格的json数据转换为二维数组
  const { name, rows } = sheets.data[0]
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
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, name)
  XLSX.writeFile(wb, filePath)
  // 文件地址
  let relativeUrl = tmsFs.pathWithPrefix(
    path.join(fileName, `${fileName}.xlsx`)
  )

  return relativeUrl
}
/**
 * 导出到集合文档
 *
 * @param ctrl
 * @param tmwCl
 * @param sheets
 * @param options
 */
async function exportAsDocs(ctrl, tmwCl, sheets, options = { startRow: 1 }) {
  const { schema_id } = tmwCl
  if (!schema_id || typeof schema_id !== 'string')
    throw Error('集合没有提供schema，无法执行自由表格导出到集合文档')

  // 集合的schema定义
  const modelSchema = new ModelSchema(
    ctrl.mongoClient,
    ctrl.bucket,
    ctrl.client
  )
  const docSchema = await modelSchema.bySchemaId(schema_id)
  const schemaIter = new SchemaIter({
    type: 'object',
    properties: docSchema,
  })
  // 自由表格的列名称
  const fieldNames: string[] = []
  for (let schemaProp of schemaIter) {
    const { fullname, _name } = schemaProp
    if (!_name) continue
    fieldNames.push(fullname)
  }
  /**
   * 生成文档
   */
  const docs = [] // 将表格的json数据转换为二维数组
  const { rows } = sheets.data[0]
  Object.entries(rows).forEach(([key, row]: [string, any]) => {
    // rows中有len字段
    if (!row || typeof row !== 'object') return
    let rIndex = parseInt(key)
    if (rIndex + 1 < options.startRow) return
    // 生成文档
    let doc = {}
    let { cells } = row
    Object.entries(cells).forEach(([key, cell]: [string, any]) => {
      let cIndex = parseInt(key)
      // 补充空列
      if (cIndex < fieldNames.length) doc[fieldNames[cIndex]] = cell.text
    })
    docs.push(doc)
  })
  /**
   * 保存到数据库
   */
  const modelDb = new ModelDb(ctrl.mongoClient, ctrl.bucket, ctrl.client)
  const existDb = await modelDb.byName(tmwCl.db.name)
  if (!existDb) throw Error(`数据库【${tmwCl.db.name}】不存在`)

  await createDocuments(ctrl, existDb, tmwCl.name, docs)
}

/**
 * 集合自由表格的数据为excel文件，json文件或者集合文档
 */
class SpreadsheetExportPlugin extends PluginBase {
  constructor(file: string) {
    super(file)
    this.name = 'doc-spreadsheet-export'
    this.title = '导出表格'
    this.description =
      '在自由表格中，将数据按JSON或者EXCEL格式导出，或者导出为集合文档。'
    this.scope = PluginProfileScope.document
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
  async _getSpreadsheetData(ctrl, tmwCl) {
    const modelSc = new ModelSpreadsheet(
      ctrl.mongoClient,
      ctrl.bucket,
      ctrl.client
    )
    const [isOk, data] = await modelSc.list(tmwCl.db.sysname, tmwCl.sysname)
    if (!isOk) return [isOk, data]
    if (Array.isArray(data) && data.length === 1) {
      return await modelSc.byId(tmwCl.db.sysname, data[0]._id.toString())
    }
    return [false, '指定的集合没有表格数据']
  }
  /**
   *
   * @param ctrl
   * @param tmwCl
   * @returns
   */
  async execute(ctrl: any, tmwCl: any) {
    const [ok, sheets] = await this._getSpreadsheetData(ctrl, tmwCl)
    if (ok === false) return { code: 10001, msg: sheets }

    let { outType, startRow } = ctrl.request.body.widget
    let relativeUrl
    switch (outType) {
      case 'excel':
        relativeUrl = exportAsExcel(ctrl, tmwCl, sheets)
        break
      case 'json':
        relativeUrl = exportAsJson(ctrl, tmwCl, sheets)
        break
      case 'docs':
        await exportAsDocs(ctrl, tmwCl, sheets, { startRow })
        break
      default:
        return { code: 10001, msg: `不支持的导出类型【${outType}】` }
    }

    if (relativeUrl) {
      let appContext = ctrl.tmsContext.AppContext.insSync()
      let url = `${appContext.router?.fsdomain?.prefix ?? ''}/${relativeUrl}`
      return { code: 0, msg: { url } }
    }

    return { code: 0, msg: {} }
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
    const newPlugin = new SpreadsheetExportPlugin(file)
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
