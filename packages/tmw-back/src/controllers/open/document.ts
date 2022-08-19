import { ResultData, ResultFault } from 'tms-koa'
import Base from 'tmw-kit/dist/ctrl/base'
import DocumentHelper from '../documentHelper'
import { ModelDoc } from 'tmw-kit'

function makeProjection(fields: any, fixed = { _id: 0 }) {
  return fields
    ? fields.split(',').reduce((result, field) => {
        result[field] = 1
        return result
      }, fixed)
    : null
}

/**
 * 开放端文档对象控制器
 */
class Document extends Base {
  docHelper: DocumentHelper
  modelDoc: ModelDoc

  constructor(...args) {
    super(...args)
    this.docHelper = new DocumentHelper(this)
    this.modelDoc = new ModelDoc(this.mongoClient, this.bucket, this.client)
  }
  /**
   * 根据ID返回单个文档的数据
   * @returns
   */
  async get() {
    const existCl = await this.docHelper.findRequestCl()

    const { id, fields } = this.request.query

    let projection = makeProjection(fields)
    let existDoc = await this.modelDoc.byId(existCl, id, projection)
    if (!existDoc) return new ResultFault('指定的文档不存在')

    return new ResultData(existDoc)
  }
  /**
   * 根据条件返回符合的文档列表
   * @returns
   */
  async list() {
    const existCl = await this.docHelper.findRequestCl()

    const { page, size, fields } = this.request.query
    const { filter, orderBy } = this.request.body
    let projection = makeProjection(fields)

    let [ok, result] = await this.modelDoc.list(
      existCl,
      { filter, orderBy },
      { page, size },
      true,
      projection
    )
    if (ok === false) return new ResultFault(result)

    return new ResultData(result)
  }
}

export default Document
