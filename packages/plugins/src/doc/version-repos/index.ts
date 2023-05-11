import { PluginBase } from 'tmw-kit/dist/model'
import { loadConfig } from 'tmw-kit'
import { LocalFS } from 'tms-koa/dist/model/fs/local'
import * as path from 'path'
import * as _ from 'lodash'
import * as fs from 'fs'
import * as glob from 'glob'

/**配置文件存放位置*/
const ConfigDir = path.resolve(
  process.env.TMS_KOA_CONFIG_DIR || process.cwd() + '/config'
)

// 插件配置文件地址
const ConfigFile =
  process.env.TMW_PLUGIN_DOC_VERSION_REPOS_CONFIG_NAME ||
  './plugin/doc/version-repos'

/**
 * 用户配置信息
 */
type UserConfig = {
  field: string // 给指定的字段生成版本文件
  extensionName: string //版本文件扩展名
}

/**
 * 描述文档的版本信息
 */
class DocCommitsInfo {
  /**
   * 版本数量
   */
  total = 0
  /**
   * 最后1次提交的版本号
   */
  maxUsedNum?: number
  /**
   * 已使用的版本号
   */
  usedNums?: number[]
}
/**
 * 文本文件系统作为文件版本库
 */
class LocalFsRepos {
  plugin: VersionReposPlugin
  constructor(plugin: VersionReposPlugin) {
    this.plugin = plugin
  }
  /**
   *
   * @param tmsContext
   * @returns
   */
  private localFs(tmsContext: any) {
    const fsContext = tmsContext.FsContext.insSync()
    const domain = fsContext.getDomain(this.plugin.fsDomainName)

    const tmsFs = new LocalFS(tmsContext, domain.name)
    return tmsFs
  }
  /**
   *
   * @param doc
   * @returns
   */
  private docFilename(doc) {
    return doc._id.toString()
  }
  /**
   * 保存1个版本
   * 版本号从1开始，否则，在最大已用版本号上加1
   *
   * @param tmsContext
   * @param dbName
   * @param clName
   * @param doc
   * @returns
   */
  async createCommit(tmsContext, dbName, clName, doc, config: UserConfig) {
    const tmsFs = this.localFs(tmsContext)
    let filename = this.docFilename(doc)
    let filedir = path.join(dbName, clName)
    if (config.field && typeof config.field === 'string') {
      filedir = path.join(filedir, config.field)
    }
    let filepath =
      path.join(filedir, filename) + '.' + (config.extensionName ?? 'json')
    let fullpath = path.join(tmsFs.rootDir, filepath)
    /**
     * 检查文件是否存在，如果存在，已有文件作为历史版本
     */
    let latestIndex = 0
    const commitInfo = await this.listCommits(
      tmsContext,
      dbName,
      clName,
      doc,
      config
    )
    if (commitInfo.total) {
      latestIndex = commitInfo.maxUsedNum === -1 ? 1 : ++commitInfo.maxUsedNum
      fs.renameSync(fullpath, `${fullpath}.${latestIndex}`)
    }
    /**
     * 保存到文件
     */
    let content
    if (config.field && typeof config.field) {
      content = doc[config.field]
      if (typeof content !== 'string') content = JSON.stringify(content)
    } else {
      content = JSON.stringify(doc)
    }
    tmsFs.write(filepath, content)

    return latestIndex + 1
  }

  /**
   * 获得制定文档的历史提交数据
   * @param tmsContext
   * @param dbName
   * @param clName
   * @param doc
   * @param config
   * @returns
   */
  async listCommits(
    tmsContext,
    dbName,
    clName,
    doc,
    config: UserConfig
  ): Promise<DocCommitsInfo> {
    const tmsFs = this.localFs(tmsContext)
    let filename = this.docFilename(doc)
    let filedir = path.join(dbName, clName)
    if (config.field && typeof config.field === 'string') {
      filedir = path.join(filedir, config.field)
    }
    let fulldir = path.join(tmsFs.rootDir, filedir)
    /**
     * 检查文件是否存在，如果存在，已有文件作为历史版本
     */
    const commits: string[] = glob.sync(
      `${fulldir}/${filename}.${config.extensionName ?? ''}*`
    )

    let info = new DocCommitsInfo()
    info.total = commits.length
    if (info.total) {
      info.maxUsedNum = -1
      info.usedNums = []
      commits.reduce((info, commit) => {
        let lastPart = commit.split('.').pop()
        let verNum = parseInt(lastPart)
        if (verNum > 0) {
          info.usedNums.push(verNum)
          info.maxUsedNum = verNum > info.maxUsedNum ? verNum : info.maxUsedNum
        }
        return info
      }, info)
    }

    return info
  }
}
/**
 * 将集合中的文档数据保存版本
 */
class VersionReposPlugin extends PluginBase {
  /**
   * 文件服务域名城
   */
  fsDomainName = 'repos'
  /**
   * 版本仓库
   */
  repos: LocalFsRepos

  constructor(file: string) {
    super(file)
    this.name = 'doc-version-repos'
    this.title = '版本管理'
    this.description = '管理文档的版本。'
    this.scope = 'document'
    this.amount = 'one'
    this.beforeWidget = { name: 'external', url: '', size: '60%' }
    this.repos = new LocalFsRepos(this)
  }

  async execute(ctrl: any, tmwCl: any) {
    const [ok, docOrCause] = await this.findRequestDocs(ctrl, tmwCl)

    if (ok === false) return { code: 10001, msg: docOrCause }

    let { db, cl } = ctrl.request.query
    let { action, userConfig }: { action: string; userConfig: UserConfig } =
      ctrl.request.body.widget

    switch (action) {
      case 'commit':
        let expectedNum = await this.repos.createCommit(
          ctrl.tmsContext,
          db,
          cl,
          docOrCause,
          userConfig
        )
        return { code: 0, msg: { expectedNum } }
      case 'list':
        let commitInfo = await this.repos.listCommits(
          ctrl.tmsContext,
          db,
          cl,
          docOrCause,
          userConfig
        )

        return { code: 0, msg: { commitInfo } }
    }

    return { code: 40001, msg: '不支持的命令' }
  }
}

export function createPlugin(file: string) {
  let config
  if (ConfigFile) config = loadConfig(ConfigDir, ConfigFile)
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
      fsDomainName,
    } = config
    const newPlugin = new VersionReposPlugin(file)
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

    if (fsDomainName) newPlugin.fsDomainName = fsDomainName

    return newPlugin
  }

  return false
}
