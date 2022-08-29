import { PluginBase, exportJSON, ModelDoc } from 'tmw-kit/dist/model'
/**
 * 将集合中的文档数据导出为json文件的压缩包
 */
class ExportDocJsonPlugin extends PluginBase {
  constructor(file) {
    super(file)
    this.name = 'doc-export-json'
    this.title = '导出文档(JSON)'
    this.description = '在集合中，将文档按JSON格式导出，保存为zip包。'
    this.scope = 'document'
    this.transData = 'more'
  }

  async execute(ctrl: any, tmwCl: any) {
    const [ok, docsOrCause] = await this.findRequestDocs(ctrl, tmwCl)

    if (ok === false) return { code: 10001, msg: docsOrCause }

    /**文档导出文件*/
    const fsContext = ctrl.tmsContext.FsContext.insSync()
    const domain = fsContext.getDomain(fsContext.defaultDomain)
    const filename = `${tmwCl.name}.zip`
    const dir = tmwCl.name

    const url = exportJSON(
      ctrl.tmsContext,
      domain.name,
      docsOrCause,
      filename,
      {
        dir,
      }
    )

    return { code: 0, url }
  }
}

export function createPlugin(file: any) {
  return new ExportDocJsonPlugin(file)
}
