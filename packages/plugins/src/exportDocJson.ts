import { PluginBase, exportJSON, ModelDoc } from 'tmw-kit'
/**
 *
 */
class ExportDocJsonPlugin extends PluginBase {
  constructor(file) {
    super(file)
  }
  get name() {
    return 'exportDocJson'
  }
  get title() {
    return '导出文档(JSON)'
  }
  get description() {
    return '在集合中，将文档按JSON格式导出，保存为zip包。'
  }
  get scope() {
    return 'document'
  }
  get transData() {
    return ''
  }
  get disabled() {
    return false
  }

  async execute(ctrl: any, cl: any) {
    let { filter, docIds } = ctrl.request.body

    let modelDoc = new ModelDoc(ctrl.mongoClient, ctrl.bucket, ctrl.client)

    let result, docs
    if (Array.isArray(docIds) && docIds.length) {
      result = await modelDoc.byIds(cl, docIds)
    } else if (filter && typeof filter === 'object') {
      result = await modelDoc.list(cl, { filter })
    } else if (filter && filter === 'ALL') {
      result = await modelDoc.list(cl)
    } else {
      return { code: 10001, msg: '没有指定要导出的文档' }
    }

    if (result[0] === false) return { code: 10001, msg: result[1] }

    docs = result[1].docs ?? result[1]

    const fsContext = ctrl.tmsContext.FsContext.insSync()
    const domain = fsContext.getDomain(fsContext.defaultDomain)
    const filename = `${cl.name}.zip`
    const dir = cl.name

    const url = exportJSON(ctrl.tmsContext, domain.name, docs, filename, {
      dir,
    })
    return { code: 0, url }
  }
}

export function createPlugin(file: any) {
  return new ExportDocJsonPlugin(file)
}
