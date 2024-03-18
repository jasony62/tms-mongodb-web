import { PluginProfileScope, PluginProfileAmount } from 'tmw-data'
import { loadConfig, ModelSchema, ModelSpreadsheet, SchemaIter } from 'tmw-kit'
import { PluginBase } from 'tmw-kit/dist/plugin/index.js'
import path from 'path'
import fs from 'fs'
import _ from 'lodash'
import Debug from 'debug'

const debug = Debug('tmw:plugins:doc-import')

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址
const ConfigFile =
  process.env.TMW_PLUGIN_DOC_SPREADSHEET_IMPORT_CONFIG_NAME ||
  './plugin/doc/spreadsheet_import'

type SpreadsheetWriteOptions = {
  rebuild?: boolean
  overwrite?: boolean
  startIndex?: number
}
/**
 *
 * @param ctrl
 * @returns
 */
function getModelSchema(ctrl) {
  const modelSchema = new ModelSchema(
    ctrl.mongoClient,
    ctrl.bucket,
    ctrl.client
  )
  return modelSchema
}
/**
 * 集合列的属性定义
 *
 * @param ctrl
 * @param tmwCl
 * @returns
 */
async function getSchemaFields(ctrl, tmwCl) {
  const { schema_id } = tmwCl
  const modelSchema = getModelSchema(ctrl)
  // 集合的schema定义
  let fields
  if (schema_id && typeof schema_id === 'string')
    fields = await modelSchema.bySchemaId(schema_id)

  return fields
}
/**
 * 处理文件目录
 */
function createDir(ctrl) {
  const domain = ctrl.domain ? ctrl.domain.name : 'download'
  let space = path.join(ctrl.fsContext.rootDir, domain)
  if (ctrl.bucket) {
    ctrl.bucket = ctrl.bucket.replace(/^\/|\/$/g, '')
    space += `/${ctrl.bucket}`
  }
  if (!fs.existsSync(space)) fs.mkdirSync(space)

  return space
}
/**
 * 用于公开访问的文件路径
 */
function publicPath(ctrl, fullpath: string) {
  let publicPath = fullpath.replace(path.normalize(ctrl.fsContext.rootDir), '')

  /* 如果开放了文件下载服务添加前缀 */
  const { AppContext } = ctrl.tmsContext
  const ctx = AppContext.insSync()
  const prefix = ctx.router?.fsdomain?.prefix
  if (prefix) publicPath = path.join(prefix, publicPath)

  return publicPath
}
/**
 * 生成excel模板
 *
 * @param ctrl
 * @param tmwCl
 * @param leafLevel
 * @returns
 */
async function createXlsxTemplate(ctrl, tmwCl, leafLevel) {
  const properties = await getSchemaFields(ctrl, tmwCl)
  const schemaIter = new SchemaIter({ type: 'object', properties })

  const XLSX = await import('xlsx')

  const titleAry = [] // 标题行
  const nameAry = [] // 名称行
  leafLevel = leafLevel ? leafLevel : 0
  for (let schemaProp of schemaIter) {
    let { fullname, _path, _name, attrs } = schemaProp
    if (
      !_name ||
      fullname.replace(/\^\\/, '').indexOf('w+$') > -1 ||
      (leafLevel > 0 && fullname.split(/\./g).length - 1 >= leafLevel)
    )
      continue

    titleAry.push(attrs.title ?? '')
    nameAry.push(fullname)
    if (_path && nameAry.indexOf(_path) > -1)
      nameAry.splice(nameAry.indexOf(_path), 1)
  }

  const filePath = path.join(createDir(ctrl), `${tmwCl.name}.xlsx`)
  const ws = XLSX.utils.aoa_to_sheet([titleAry, nameAry])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws)
  XLSX.writeFile(wb, filePath)

  const publicpath = publicPath(ctrl, filePath)

  return publicpath
}
/**
 * 数据写入自由表格
 *
 * @param ctrl
 * @param tmwCl
 * @param proto
 * @param options
 * @returns
 */
async function wiriteSpreadsheet(
  ctrl,
  tmwCl,
  proto,
  options: SpreadsheetWriteOptions = {
    rebuild: false,
    overwrite: false,
    startIndex: 0,
  }
) {
  if (!proto.rows || typeof proto.rows !== 'object') {
    return [false, '没有要写入的数据']
  }

  const modelSS = new ModelSpreadsheet(
    ctrl.mongoClient,
    ctrl.bucket,
    ctrl.client
  )

  if (options.rebuild === true) {
    // 重建表格
    let [isOk] = await modelSS.byCl(tmwCl.db.sysname, tmwCl.sysname)
    if (isOk) {
      await modelSS.removeByCl(tmwCl.db.sysname, tmwCl.sysname)
    }
    await modelSS.create(ctrl.client, tmwCl.db.sysname, tmwCl, proto)
  } else {
    // 更新表格数据
    let [isOk, result] = await modelSS.byCl(tmwCl.db.sysname, tmwCl.sysname)
    if (!isOk) {
      // 如果不存在，新建表格？
      await modelSS.create(ctrl.client, tmwCl.db.sysname, tmwCl, proto)
    } else {
      let sheet = result.data[0]
      const oldRows = sheet.rows // 已有数据
      if (options.overwrite === false && options.startIndex === 0) {
        // 在结尾追加数据
        if (oldRows && typeof oldRows === 'object') {
          const rIndexs = Object.keys(oldRows)
          let rIndexOffset = rIndexs.reduce((max, rIndex) => {
            let i = parseInt(rIndex)
            return i > max ? i : max
          }, 0)
          rIndexOffset++
          if (proto.rows && typeof proto.rows === 'object') {
            Object.entries(proto.rows).forEach(([rIndex, row]) => {
              oldRows['' + (parseInt(rIndex) + rIndexOffset)] = row
            })
            const r = await modelSS.update(
              tmwCl.db.sysname,
              tmwCl.sysname,
              sheet
            )
          }
        }
      } else if (options.overwrite === false && options.startIndex > 0) {
        // 在指定位置插入
        let rIndexLastWriteRow = -1
        let rIndexOffset = options.startIndex - 1
        const newRows = {}
        Object.entries(oldRows).forEach(([rIndex, row]) => {
          let i = parseInt(rIndex)
          if (i < rIndexOffset) {
            newRows[rIndex] = row
          } else {
            if (rIndexLastWriteRow === -1) {
              Object.entries(proto.rows).forEach(([rIndex, row2]) => {
                let j = parseInt(rIndex)
                newRows['' + (j + rIndexOffset)] = row2
                rIndexLastWriteRow =
                  j > rIndexLastWriteRow ? j : rIndexLastWriteRow
              })
            }
            newRows['' + (i + rIndexLastWriteRow + 1)] = row
          }
        })
        sheet.rows = newRows
        const r = await modelSS.update(tmwCl.db.sysname, tmwCl.sysname, sheet)
      } else if (options.overwrite === true) {
        // 在指定位置插入
        let rIndexOffset = options.startIndex - 1
        const oldRows = sheet.rows
        Object.entries(proto.rows).forEach(([rIndex, row]) => {
          let i = parseInt(rIndex)
          oldRows['' + (i + rIndexOffset)] = row
        })
        const r = await modelSS.update(tmwCl.db.sysname, tmwCl.sysname, sheet)
      } else {
        return [
          false,
          `参数错误【overwrite=${options.overwrite},startIndex=${options.startIndex}】`,
        ]
      }
    }
  }

  return [true, '完成数据写入']
}
/**
 * 创建自由表格并填写数据
 *
 * @param ctrl
 * @param tmwDb
 * @param tmwCl
 * @param headersName
 * @param rowsJson
 * @param options
 * @returns
 */
async function jsonToSpreadsheet(ctrl, tmwCl, headersName, rowsJson, options) {
  const rows = rowsJson.reduce((rows, rowJson, index) => {
    const cells = {}
    headersName.forEach((name, index) => {
      if (rowJson[name]) cells['' + index] = { text: rowJson[name] }
    })
    rows['' + index] = { cells }
    return rows
  }, {})

  const proto: any = { rows }

  return await wiriteSpreadsheet(ctrl, tmwCl, proto, options)
}
/**
 * 将二维数组转换为自由表格的数据格式
 *
 * @param ctrl
 * @param tmwCl
 * @param headersName
 * @param rowsJson
 * @param options
 */
async function aoaToSpreadsheet(ctrl, tmwCl, aoa, options) {
  /**
   * 格式转换
   */
  const rows = aoa.reduce((rows, a, index) => {
    if (a.length === 0) return rows
    const cells = {}
    a.forEach((v, index) => (cells['' + index] = { text: v }))
    rows['' + index] = { cells }
    return rows
  }, {})

  const proto: any = { rows }

  return await wiriteSpreadsheet(ctrl, tmwCl, proto, options)
}
/**
 * 导入数据到自由表格
 *
 * @param ctrl
 * @param tmwCl
 * @returns
 */
async function fillSpreadsheet(ctrl, tmwCl, widget) {
  const { content, contentType, writeOptions } = widget
  if (!content) return [false, '导入内容上传失败']

  if (contentType === 'aoa') {
    const aoa = JSON.parse(content)
    if (!Array.isArray(aoa) || aoa.length === 0)
      return [false, '上传的数据为空或格式错误']
    try {
      await aoaToSpreadsheet(ctrl, tmwCl, aoa, writeOptions)
      return [true, '导入成功']
    } catch (error) {
      debug(`数据存储错误: ${error.message}`)
      return [false, error.message]
    }
  } else if (contentType === 'json') {
    const rowsJson = JSON.parse(content)

    if (!Array.isArray(rowsJson) || rowsJson.length === 0)
      return [false, '上传的数据为空或格式错误']

    const headersName: string[] = []
    const fields = await getSchemaFields(ctrl, tmwCl)
    for (const k in fields) headersName.push(k)

    try {
      await jsonToSpreadsheet(ctrl, tmwCl, headersName, rowsJson, writeOptions)
      return [true, '导入成功']
    } catch (error) {
      debug(`数据存储错误: ${error.message}`)
      return [false, error.message]
    }
  }

  return [false, `不支持处理【${contentType}】类型的内容`]
}
/**
 * 导入数据到集合中
 */
class SpreadsheetImportPlugin extends PluginBase {
  DownloadHost: string

  constructor(file: string) {
    super(file)
    this.name = 'doc-spreadsheet-import'
    this.title = '导入数据'
    this.description = '导入excel、json文件格式的数据，并导入集合中。'
    this.scope = PluginProfileScope.document
    this.amount = PluginProfileAmount.zero
    this.beforeWidget = { name: 'external', url: '', size: '40%' }
  }

  async execute(ctrl: any, tmwCl: any) {
    const [ok, docsOrCause] = await this.findRequestDocs(ctrl, tmwCl)

    if (ok === false) return { code: 10001, msg: docsOrCause }

    const { widget } = ctrl.request.body
    if (widget.action === 'download') {
      if (!this.DownloadHost)
        return { code: 10001, msg: '未配置文件下载服务地址' }
      const publicpath = await createXlsxTemplate(ctrl, tmwCl, widget.leafLevel)
      return { code: 0, msg: { filePath: this.DownloadHost + publicpath } }
    } else {
      const [isOk, msg] = await fillSpreadsheet(ctrl, tmwCl, widget)
      return { code: isOk ? 0 : 10001, msg }
    }
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
      downloadHost,
      disabled,
      spreadsheet,
      dbBlacklist,
      clBlacklist,
      schemaBlacklist,
    } = config
    const newPlugin = new SpreadsheetImportPlugin(file)
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

    if (downloadHost) newPlugin.DownloadHost = downloadHost

    return newPlugin
  }

  return false
}
