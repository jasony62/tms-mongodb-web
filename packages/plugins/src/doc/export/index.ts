import { PluginBase, exportJSON } from 'tmw-kit/dist/model/index.js'
import { loadConfig, ModelSchema, SchemaIter } from 'tmw-kit'
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

/**
 * 将集合中的文档数据导出为json或者excel文件
 */
class ExportPlugin extends PluginBase {
  constructor(file: string) {
    super(file)
    this.name = 'doc-export'
    this.title = '导出文档'
    this.description = '在集合中，将文档按JSON或者EXCEL格式导出。'
    this.scope = 'document'
    this.amount = 'many'
    this.beforeWidget = { name: 'external', url: '', size: '60%' }
  }

  async execute(ctrl: any, tmwCl: any) {
    const [ok, docsOrCause] = await this.findRequestDocs(ctrl, tmwCl)

    if (ok === false) return { code: 10001, msg: docsOrCause }

    /**文档导出文件*/
    const fsContext = ctrl.tmsContext.FsContext.insSync()
    const domain = fsContext.getDomain(fsContext.defaultDomain)

    const tmsFs = new LocalFS(ctrl.tmsContext, domain.name)

    // 文件名同时也做为目录名
    const { name: fileName, schema_id } = tmwCl
    let filePath = tmsFs.pathWithRoot(fileName)

    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { recursive: true })
    }
    fs.mkdirSync(filePath, { recursive: true })

    let { outType, outAmount, leafLevel } = ctrl.request.body.widget
    let url
    if (outType === 'excel') {
      const XLSX = require('xlsx')

      leafLevel = leafLevel ? leafLevel : 0
      filePath = path.join(filePath, `${fileName}.xlsx`)

      // 集合的schema定义
      const modelSchema = new ModelSchema(
        ctrl.mongoClient,
        ctrl.bucket,
        ctrl.client
      )
      let docSchema
      if (schema_id && typeof schema_id === 'string')
        docSchema = await modelSchema.bySchemaId(schema_id)

      const schemaIter = new SchemaIter({
        type: 'object',
        properties: docSchema,
      })
      let newDocs = []
      docsOrCause.forEach((doc) => {
        let middleAry = {}
        for (let schemaProp of schemaIter) {
          const { fullname, _path, _name } = schemaProp
          if (!_name) continue
          if (leafLevel > 0 && fullname.split(/\./g).length - 1 >= leafLevel)
            continue
          let val = _.get(doc, fullname)
          if (!val) continue
          if (typeof val === 'object') val = JSON.stringify(val)
          middleAry[fullname] = val
          if (_path && middleAry[_path]) delete middleAry[_path]
        }
        newDocs.push(middleAry)
      })

      const ws = XLSX.utils.json_to_sheet(newDocs)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws)
      XLSX.writeFile(wb, filePath)

      url = tmsFs.pathWithPrefix(filePath)
    } else if (outType === 'json') {
      url = exportJSON(
        ctrl.tmsContext,
        domain.name,
        docsOrCause,
        `${fileName}.zip`,
        {
          dir: fileName,
          outAmount,
        }
      )
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
