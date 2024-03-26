import { PluginProfileScope, PluginProfileAmount } from 'tmw-data'
import {
  loadConfig,
  ModelSchema,
  SchemaIter,
  ModelSpreadsheet,
  exportJSON,
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
  process.env.TMW_PLUGIN_DOC_EXPORT_CONFIG_NAME || './plugin/doc/export'

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
  const filePath = tmsFs.pathWithRoot(fileName)

  if (fs.existsSync(filePath)) fs.rmSync(filePath, { recursive: true })

  return { filePath, fileName, domain, tmsFs }
}
/**
 * 获得文档列定义的迭代器
 *
 * @param ctrl
 * @param schema_id
 * @returns
 */
async function getDocSchemaIter(ctrl: any, schema_id: string) {
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
  return schemaIter
}
/**
 * 根据文档列定义，转换值的表示
 *
 * @param attrs
 * @param val
 * @param doc
 */
function readableValue(attrs, val, doc?) {
  switch (attrs.type) {
    case 'boolean':
      return val ? '是' : '否'
    case 'number':
    case 'string':
      if (attrs.enum?.length) {
        if (attrs.enumGroups?.length) {
          const group = attrs.enumGroups.find(
            (g: any) => g.assocEnum.value === doc[g.assocEnum.property]
          )
          if (!group) return ''
          const option = attrs.enum.find(
            (o: any) => o.group === group.id && o.value === val
          )
          if (!option) return ''
          return option.label
        } else {
          const option = attrs.enum.find((o: any) => o.value === val)
          if (!option) return ''
          return option.label
        }
      } else if (attrs.oneOf?.length) {
        if (attrs.enumGroups?.length) {
          const group = attrs.enumGroups.find(
            (g: any) => g.assocEnum.value === doc[g.assocEnum.property]
          )
          if (!group) return ''
          const option = attrs.oneOf.find(
            (o: any) => o.group === group.id && o.value === val
          )
          if (!option) return ''
          return option.label
        } else {
          const option = attrs.oneOf.find((o: any) => o.value === val)
          if (option) return option.label
        }
      }
      break
    case 'array':
      if (!Array.isArray(val) || val.length === 0) return ''
      if (attrs.enum?.length) {
        if (attrs.enumGroups?.length) {
          const group = attrs.enumGroups.find(
            (g: any) => g.assocEnum.value === doc[g.assocEnum.property]
          )
          if (!group) return ''
          const options = attrs.enum.filter(
            (o: any) => o.group === group.id && val.includes(o.value)
          )
          return options.map((o: any) => o.label).join(' ')
        } else {
          const options = attrs.enum.filter((o: any) => val.includes(o.value))
          return options.map((o: any) => o.label).join(' ')
        }
      } else if (attrs.anyOf?.length) {
        if (attrs.enumGroups?.length) {
          const group = attrs.enumGroups.find(
            (g: any) => g.assocEnum.value === doc[g.assocEnum.property]
          )
          if (!group) return ''
          const options = attrs.anyOf.filter(
            (o: any) => o.group === group.id && val.includes(o.value)
          )
          return options.map((o: any) => o.label).join(' ')
        } else {
          const options = attrs.anyOf.filter((o: any) => val.includes(o.value))
          return options.map((o: any) => o.label).join(' ')
        }
      }
      break
  }

  return val
}
/**
 * 导出为excel文件
 *
 * 第1行是标题行，第2行是名称行
 *
 * @param ctrl
 * @param tmwCl
 * @param docs
 * @param leafLevel
 * @returns
 */
async function exportAsExcel(ctrl, tmwCl, docs, leafLevel): Promise<string> {
  const { schema_id } = tmwCl
  if (!schema_id || typeof schema_id !== 'string')
    throw Error('集合没有提供schema，无法执行自由表格导出到集合文档')

  const XLSX = await import('xlsx')

  let { filePath, fileName, tmsFs } = getExportFileInfo(ctrl, tmwCl)

  filePath = path.join(filePath, `${fileName}.xlsx`)

  // 集合的schema定义
  const schemaIter = await getDocSchemaIter(ctrl, schema_id)

  leafLevel = leafLevel ? leafLevel : 0

  const titleAry = [] // 标题行
  const nameAry = [] // 名称行
  const propAry = []
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
    propAry.push(schemaProp)
    if (_path && nameAry.indexOf(_path) > -1) {
      let pos = nameAry.indexOf(_path)
      titleAry.splice(pos, 1)
      nameAry.splice(pos, 1)
      propAry.splice(pos, 1)
    }
  }

  const rows = [titleAry, nameAry]
  docs.forEach((doc) => {
    const row = nameAry.reduce((data, name, index) => {
      const prop = propAry[index]
      const valRaw = _.get(doc, name)
      const text = readableValue(prop.attrs, valRaw, doc)
      data.push(text)
      return data
    }, [])
    rows.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws)
  XLSX.writeFile(wb, filePath)
  // 文件地址
  const relativeUrl = tmsFs.pathWithPrefix(
    path.join(fileName, `${fileName}.xlsx`)
  )

  return relativeUrl
}

/**
 * 导出为json文件
 *
 * @param ctrl
 * @param tmwCl
 * @param docs
 * @param outAmount
 * @returns
 */
async function exportAsJson(ctrl, tmwCl, docs, outAmount): Promise<string> {
  const { domain, tmsFs } = getExportFileInfo(ctrl, tmwCl)
  // 文件名同时也做为目录名
  const { name: fileName } = tmwCl
  exportJSON(ctrl.tmsContext, domain.name, docs, `${fileName}.zip`, {
    dir: fileName,
    outAmount,
  })
  // 文件地址
  let relativeUrl = tmsFs.pathWithPrefix(path.join(fileName, `${fileName}.zip`))
  return relativeUrl
}
/**
 * 文档数据导出到自由表格
 *
 * @param ctrl
 * @param tmwCl
 * @param docs
 */
async function exportAsSpreadsheet(ctrl, tmwCl, docs) {
  // 集合的schema定义
  const schemaIter = await getDocSchemaIter(ctrl, tmwCl.schema_id)
  const headersName: string[] = []
  for (let schemaProp of schemaIter) {
    const { _name } = schemaProp
    if (!_name) continue
    headersName.push(_name)
  }
  /**
   * 生成自由表格数据部分
   */
  const rows = docs.reduce((rows, rowJson, index) => {
    const cells = {}
    headersName.forEach((name, index) => {
      if (rowJson[name]) cells['' + index] = { text: rowJson[name] }
    })
    rows['' + index] = { cells }
    return rows
  }, {})

  const proto: any = { rows }
  const modelSS = new ModelSpreadsheet(
    ctrl.mongoClient,
    ctrl.bucket,
    ctrl.client
  )
  // 删除已有的数据
  await modelSS.removeByCl(tmwCl.db.sysname, tmwCl.sysname)
  // 创建自由表格
  await modelSS.create(ctrl.client, tmwCl.db.sysname, tmwCl, proto)
}
/**
 * 将集合中的文档数据导出为json或者excel文件
 */
class ExportPlugin extends PluginBase {
  constructor(file: string) {
    super(file)
    this.name = 'doc-export'
    this.title = '导出数据'
    this.description = '将集合中的文档按JSON或者EXCEL格式导出。'
    this.scope = PluginProfileScope.document
    this.amount = PluginProfileAmount.many
    this.beforeWidget = { name: 'external', url: '', size: '60%' }
  }

  async execute(ctrl: any, tmwCl: any) {
    const [ok, docsOrCause] = await this.findRequestDocs(ctrl, tmwCl)

    if (ok === false) return { code: 10001, msg: docsOrCause }

    let { outType, outAmount, leafLevel } = ctrl.request.body.widget
    let relativeUrl, url
    switch (outType) {
      case 'excel':
        relativeUrl = await exportAsExcel(ctrl, tmwCl, docsOrCause, leafLevel)
        break
      case 'json':
        relativeUrl = await exportAsJson(ctrl, tmwCl, docsOrCause, outAmount)
        break
      case 'spreadsheet':
        await exportAsSpreadsheet(ctrl, tmwCl, docsOrCause)
        break
      default:
        return { code: 10001, msg: `不支持的导出类型【${outType}】` }
    }

    if (relativeUrl) {
      let appContext = ctrl.tmsContext.AppContext.insSync()
      url = `${appContext.router?.fsdomain?.prefix ?? ''}/${relativeUrl}`
      return { code: 0, msg: { url } }
    } else {
      return { code: 0, msg: {} }
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
      disabled,
      dbBlacklist,
      clBlacklist,
      schemaBlacklist,
    } = config
    const newPlugin = new ExportPlugin(file)
    newPlugin.beforeWidget.url = widgetUrl

    if (bucket) newPlugin.bucketName = new RegExp(bucket)
    if (db) newPlugin.dbName = new RegExp(db)
    if (cl) newPlugin.clName = new RegExp(cl)
    if (schema) newPlugin.schemaName = new RegExp(schema)

    if (title && typeof title === 'string') newPlugin.title = title

    if (disabled) newPlugin.disabled = disabled
    if (dbBlacklist) newPlugin.dbBlacklist = new RegExp(dbBlacklist)
    if (clBlacklist) newPlugin.clBlacklist = new RegExp(clBlacklist)
    if (schemaBlacklist) newPlugin.schemaBlacklist = new RegExp(schemaBlacklist)

    return newPlugin
  }

  return false
}
