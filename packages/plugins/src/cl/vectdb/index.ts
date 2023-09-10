import {
  PluginProfileScope,
  PluginProfileAmount,
  PluginExecuteResult,
} from 'tmw-data'
import { loadConfig, ModelDoc } from 'tmw-kit'
import { PluginBase } from 'tmw-kit/dist/plugin/index.js'
import path from 'path'
import fs from 'fs'
import _ from 'lodash'
import Debug from 'debug'

const debug = Debug('tmw:plugins:cl-vecdb')

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件名（不含扩展名）
const ConfigFile =
  process.env.TMW_PLUGIN_CL_VECDB_CONFIG_NAME || './plugin/cl/vecdb'

/**
 * 集合向量数据库
 */
class VecdbPlugin extends PluginBase {
  clDocListUrl: string
  llmModelName: string
  storeRoot: string
  vecdbkitNpmSpeifier: string

  constructor(file: string) {
    super(file)
    this.name = 'cl-vecdb'
    this.title = '集合向量数据库'
    this.description = '给集合生成向量数据库。'
    this.scope = PluginProfileScope.collection
    this.amount = PluginProfileAmount.one
    this.beforeWidget = { name: 'external', url: '', size: '40%' }
  }

  async execute(ctrl: any, tmwDb: any): Promise<PluginExecuteResult> {
    const { db: dbName } = ctrl.request.query
    const { name: clName } = ctrl.request.body
    const { action } = ctrl.request.body.widget

    debug(`开始处理【${dbName}/${clName}】中的文档`)

    switch (action) {
      case 'build': {
        debug(`准备新建向量数据库`)
        const { accessToken, build } = ctrl.request.body.widget
        // 获得集合下文档的api地址
        let tmwUrl = `${this.clDocListUrl}?db=${dbName}&cl=${clName}`
        let { modelName, vecField, metaField } = build
        // 默认使用的语言大模型
        modelName ??= this.llmModelName
        // _id字段默认作为元数据
        if (!metaField) metaField = '_id'
        else if (metaField.indexOf('_id') == -1) metaField = '_id,' + metaField
        // 使用数据库名称和集合名称组成向量数据库名称
        const storePath = `${this.storeRoot}/${dbName}/${clName}`
        const { buildFromTmw } = await import(this.vecdbkitNpmSpeifier)
        const vecDocs = await buildFromTmw(
          tmwUrl,
          accessToken,
          vecField,
          metaField,
          storePath,
          modelName
        )
        const msg = `完成新建向量数据库，生成个${vecDocs.length}向量文档`
        debug(msg)
        return { code: 0, msg }
      }
      case 'retrieve': {
        debug(`准备检索向量数据库`)
        const { retrieve } = ctrl.request.body.widget
        if (!retrieve || typeof retrieve !== 'object')
          return { code: 0, msg: `没有提供检索条件` }
        const { text } = retrieve
        if (!text || typeof text !== 'string')
          return { code: 0, msg: `没有提供检索内容` }
        const modelName = this.llmModelName
        const store = `${this.storeRoot}/${dbName}/${clName}`
        const { runPerset } = await import(this.vecdbkitNpmSpeifier)
        const vecDocs = await runPerset(
          'vector-doc',
          { store },
          text,
          modelName
        )
        /**
         * 查找原始文当
         */
        const modelDoc = new ModelDoc(
          ctrl.mongoClient,
          ctrl.bucket,
          ctrl.client
        )
        //@TODO 这是个临时解决放哪应该由框架解决
        const tmwCl = {
          ...ctrl.request.body,
          db: tmwDb,
        }
        delete tmwCl.widget
        const tmwDocs = []
        for (let vDoc of vecDocs) {
          let { _id } = vDoc.metadata
          let doc = await modelDoc.byId(tmwCl, _id)
          tmwDocs.push(doc)
        }

        debug(`完成检索向量数据库，返回${tmwDocs.length}个文档`)
        return { code: 0, msg: { vecDocs, tmwDocs } }
      }
    }

    return { code: 0, msg: `不支持的操作【${action}】` }
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
      title,
      disabled,
      dbBlacklist,
      llmModelName,
      storeRoot,
      vecdbkitNpmSpeifier,
      clDocListUrl,
    } = config

    if (storeRoot && !fs.existsSync(storeRoot)) {
      debug(`指定的向量数据存储根目录【${storeRoot}】不存在`)
      return false
    }

    const newPlugin = new VecdbPlugin(file)
    newPlugin.beforeWidget.url = widgetUrl

    if (bucket) newPlugin.bucketName = new RegExp(bucket)
    if (db) newPlugin.dbName = new RegExp(db)

    if (title && typeof title === 'string') newPlugin.title = title

    if (disabled) newPlugin.disabled = disabled
    if (dbBlacklist) newPlugin.dbBlacklist = new RegExp(dbBlacklist)

    newPlugin.clDocListUrl = clDocListUrl

    newPlugin.llmModelName = llmModelName

    newPlugin.storeRoot = storeRoot

    newPlugin.vecdbkitNpmSpeifier = vecdbkitNpmSpeifier

    return newPlugin
  }

  return false
}
