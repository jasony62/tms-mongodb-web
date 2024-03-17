import { PluginProfileScope, PluginProfileAmount } from 'tmw-data'
import {
  loadConfig,
  ModelSchema,
  ModelDoc,
  SchemaIter,
  createDocWebhook,
} from 'tmw-kit'
import { PluginBase } from 'tmw-kit/dist/plugin/index.js'
import path from 'path'
import fs from 'fs'
import _ from 'lodash'
import { pinyin } from 'pinyin-pro'
import Debug from 'debug'

const debug = Debug('tmw:plugins:doc-import')

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址
const ConfigFile =
  process.env.TMW_PLUGIN_DOC_IMPORT_CONFIG_NAME || './plugin/doc/import'

/**
 * 导入数据到集合中
 */
class ImportPlugin extends PluginBase {
  DownloadHost: string

  constructor(file: string) {
    super(file)
    this.name = 'doc-import'
    this.title = '从文件导入数据'
    this.description = '导入excel、json文件格式的数据，并导入集合中。'
    this.scope = PluginProfileScope.document // 查看集合文档时可见
    this.amount = PluginProfileAmount.zero
    this.rejectedRight = ['readDoc'] // 如果只允许读集合中的文档，不允许导入文档
    this.beforeWidget = { name: 'external', url: '', size: '60%' }
  }

  async execute(ctrl: any, tmwCl: any) {
    const [ok, docsOrCause] = await this.findRequestDocs(ctrl, tmwCl)

    if (ok === false) return { code: 10001, msg: docsOrCause }

    const { widget } = ctrl.request.body
    const { name: clName, schema_id } = tmwCl

    const modelSchema = new ModelSchema(
      ctrl.mongoClient,
      ctrl.bucket,
      ctrl.client
    )
    // 集合的schema定义
    let columns
    if (schema_id && typeof schema_id === 'string')
      columns = await modelSchema.bySchemaId(schema_id)

    if (widget.action === 'download') {
      if (!this.DownloadHost)
        return { code: 10001, msg: '未配置文件下载服务地址' }

      const schemaIter = new SchemaIter({ type: 'object', properties: columns })
      const processRst = await this.processExcelTemplate(
        ctrl,
        clName,
        schemaIter,
        widget.leafLevel
      )
      const publicpath = this.publicPath(ctrl, processRst)
      return { code: 0, msg: { filePath: this.DownloadHost + publicpath } }
    }

    const file = widget.file
    if (!file) {
      return { code: 10001, msg: '文件上传失败' }
    }

    let rowsJson = JSON.parse(file)
    if (!Array.isArray(rowsJson) || rowsJson.length === 0)
      return { code: 10001, msg: '上传的文件数据为空或格式错误' }

    let schemaStr = ''
    if (columns) {
      for (const k in columns) {
        schemaStr += k + ','
      }
    }
    debug(`schemaStr[${schemaStr}]`)

    const modelDoc = new ModelDoc(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const docWebhook = createDocWebhook(process.env.TMW_APP_WEBHOOK)

    // 将没有schema定义的数据保存在指定的属性中
    let extra = process.env.TMW_PLUGIN_DOC_IMPORT_EXTRA_KEY_NAME || 'extra'
    let importedRows = rowsJson.map((row) => {
      let newRow: any = {}
      if (columns) {
        for (const k in columns) {
          let column = columns[k]
          let rDByTitle = row[column.title]
          if (typeof rDByTitle === 'number') {
            newRow[k] = String(rDByTitle)
          } else if (typeof rDByTitle === 'undefined') {
            // 单选
            if (
              column.type === 'string' &&
              column.enum &&
              column.enum.length &&
              column.default &&
              column.default.length
            ) {
              newRow[k] = column.enum.find(
                (ele) => ele.value === column.default
              ).label
            } else if (
              column.type === 'array' &&
              column.enum &&
              column.enum.length &&
              column.default &&
              column.default.length
            ) {
              const target = column.enum.map((ele) => {
                if (column.default.includes(ele.value)) {
                  return ele.label
                }
              })
              newRow[k] = target.join(',')
            } else {
              //存在默认值
              newRow[k] = column.default || null
            }
          } else {
            newRow[k] = rDByTitle
          }
        }
      }

      for (let k in row) {
        let oneRow = _.get(row, k)

        if (typeof oneRow === 'number') oneRow = String(oneRow)

        if (schemaStr.indexOf(k) > -1) {
          if (newRow[k] === null) _.set(newRow, k, oneRow)
        } else if (k.indexOf('.') > -1) {
          const objKey = k.replace(/\./g, '.properties.')
          if (typeof _.get(columns, objKey) === 'object')
            _.set(newRow, k.split('.'), oneRow)
        } else {
          // 检查是否包含中文
          if (/[\u4E00-\u9FA5]+/g.test(k)) {
            k = pinyin(k, { toneType: 'none' })
            k = k.replace(/ +/g, '_')
          }
          _.set(newRow, [extra, k], oneRow)
        }
      }

      // 加工数据
      modelDoc.processBeforeStore(newRow, 'insert', columns)

      return newRow
    })

    try {
      // 通过webhook处理数据
      let beforeRst: any = await docWebhook.beforeCreate(importedRows, tmwCl)

      if (beforeRst.passed !== true)
        return {
          code: 10001,
          msg: beforeRst.reason || '操作被Webhook.beforeCreate阻止',
        }

      if (beforeRst.rewrited && typeof beforeRst.rewrited === 'object')
        importedRows = beforeRst.rewrited

      // 数据存储到集合中
      const rst = await modelDoc.createMany(tmwCl, importedRows)
      debug(`导入的数据已存储到[db=${tmwCl.db.sysname}][cl=${clName}]`)

      // 通过webhook处理数据
      let afterRst: any = await docWebhook.afterCreate(rst, tmwCl)
      if (afterRst.passed !== true)
        return {
          code: 10001,
          msg: afterRst.reason || '操作被Webhook.afterCreate阻止',
        }

      return { code: 0, msg: '导入成功' }
    } catch (error) {
      debug(`数据存储错误: ${error.message}`)
      return { code: 10001, msg: error.message }
    }
  }

  /**
   * 生成excel模板
   */
  private async processExcelTemplate(ctrl, clName, schemaIter, leafLevel) {
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
      if (_path && nameAry.indexOf(_path) > -1) {
        let pos = nameAry.indexOf(_path)
        titleAry.splice(pos, 1)
        nameAry.splice(pos, 1)
      }
    }
    const filePath = path.join(this.createDir(ctrl), `${clName}.xlsx`)

    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([titleAry, nameAry])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws)
    XLSX.writeFile(wb, filePath)

    return filePath
  }
  /**
   * 处理文件目录
   */
  private createDir(ctrl) {
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
  private publicPath(ctrl, fullpath) {
    let publicPath = fullpath.replace(
      path.normalize(ctrl.fsContext.rootDir),
      ''
    )

    /* 如果开放了文件下载服务添加前缀 */
    const { AppContext } = ctrl.tmsContext
    const prefix = _.get(AppContext.insSync(), 'router.fsdomain.prefix')
    if (prefix) publicPath = path.join(prefix, publicPath)

    return publicPath
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
      dbBlacklist,
      clBlacklist,
      schemaBlacklist,
    } = config
    const newPlugin = new ImportPlugin(file)
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

    if (downloadHost) newPlugin.DownloadHost = downloadHost

    return newPlugin
  }

  return false
}
