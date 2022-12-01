import { ResultData, ResultFault } from 'tms-koa'
import Base from 'tmw-kit/dist/ctrl/base'
import DocumentHelper from '../documentHelper'
import { ModelDoc, ModelSchema, SchemaIter, AES } from 'tmw-kit'
import * as _ from 'lodash'

/**
 *
 * @param fields 逗号分隔的字符串
 * @param fixed
 * @returns
 */
function makeProjection(fields: string, fixed = { _id: 0 }) {
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
   * 检查请求是否来源于可信主机，跳过认证机制
   */
  static tmsAuthTrustedHosts() {
    return true
  }
  /**
   *
   * @param schema_id
   * @returns
   */
  private async getClSchema(schema_id: string) {
    const modelSchema = new ModelSchema(
      this.mongoClient,
      this.bucket,
      this.client
    )

    // 集合的schema定义
    let clSchema
    if (schema_id && typeof schema_id === 'string')
      clSchema = await modelSchema.bySchemaId(schema_id)

    return clSchema
  }
  /**
   * 根据ID返回单个文档的数据
   * @returns
   */
  async get() {
    const existCl = await this.docHelper.findRequestCl()

    const { schema_id } = existCl

    const { id, fields } = this.request.query

    let projection = makeProjection(fields)
    let existDoc = await this.modelDoc.byId(existCl, id, projection)
    if (!existDoc) return new ResultFault('指定的文档不存在')

    /**解封加密数据*/
    // 集合的schema定义
    const clSchema = await this.getClSchema(schema_id)
    const schemaIter = new SchemaIter({ type: 'object', properties: clSchema })
    for (let schemaProp of schemaIter) {
      let { fullname, attrs } = schemaProp
      if (attrs.format === 'password') {
        let val = _.get(existDoc, fullname)
        if (val && typeof val === 'string') {
          let decrypted = AES.decrypt(val)
          _.set(existDoc, fullname, decrypted)
        }
      }
    }

    return new ResultData(existDoc)
  }
  /**
   * 根据条件返回符合的文档列表
   * @returns
   */
  async list() {
    const existCl = await this.docHelper.findRequestCl()

    const { schema_id } = existCl

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

    if (result.total) {
      /**解封加密数据*/
      const clSchema = this.getClSchema(schema_id)
      const schemaIter = new SchemaIter({
        type: 'object',
        properties: clSchema,
      })
      for (let schemaProp of schemaIter) {
        let { fullname, attrs } = schemaProp
        if (attrs.format === 'password') {
          result.docs.forEach((doc) => {
            let val = _.get(doc, fullname)
            if (val && typeof val === 'string') {
              let decrypted = AES.decrypt(val)
              _.set(doc, fullname, decrypted)
            }
          })
        }
      }
    }

    return new ResultData(result)
  }
  /**
   * 根据条件查找唯一匹配的文档
   */
  async findOne() {
    const existCl = await this.docHelper.findRequestCl()

    const { schema_id } = existCl

    const { fields } = this.request.query
    const { filter } = this.request.body
    let projection = makeProjection(fields)

    let existDoc = await this.modelDoc.findOne(existCl, { filter }, projection)
    if (!existDoc) return new ResultFault('指定的文档不存在')

    /**解封加密数据*/
    const clSchema = await this.getClSchema(schema_id)
    const schemaIter = new SchemaIter({ type: 'object', properties: clSchema })
    for (let schemaProp of schemaIter) {
      let { fullname, attrs } = schemaProp
      if (attrs.format === 'password') {
        let val = _.get(existDoc, fullname)
        if (val && typeof val === 'string') {
          let decrypted = AES.decrypt(val)
          _.set(existDoc, fullname, decrypted)
        }
      }
    }

    return new ResultData(existDoc)
  }
}

export default Document
