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
   * 检查请求是否来源于可信主机，符合就跳过认证机制
   */
  static tmsAuthTrustedHosts() {
    return true
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
  /**
   * 在指定的集合中新建文档
   */
  async create() {
    const existCl = await this.docHelper.findRequestCl()

    const { name: clName, extensionInfo } = existCl
    let data = this.request.body

    /**在数据库中创建记录*/
    const createOne = async (doc) => {
      // 加工数据
      this.modelDoc.beforeProcessByInAndUp(doc, 'insert')

      return this.docHelper
        .findSysColl(existCl)
        .insertOne(doc)
        .then(async (r) => {
          await this.modelDoc.dataActionLog(
            r.ops,
            '创建',
            existCl.db.name,
            clName
          )
          return doc
        })
    }

    let result: any
    if (Array.isArray(data) && data.length) {
      result = []
      for (let i = 0; i < data.length; i++) {
        let newDoc = await createOne(data[i])
        result.push(newDoc)
      }
    } else if (data && typeof data === 'object') {
      let newDoc = await createOne(data)
      result = newDoc
    }

    return new ResultData(result)

    // 去重校验
    // const result = this.modelDoc.findUnRepeatRule(existCl)
    // if (result[0]) {
    //   const { dbName, clName: collName, keys, insert } = result[1]
    //   const curDoc = [doc]
    //   const curConfig = {
    //     config: {
    //       columns: keys,
    //       db: dbName,
    //       cl: collName,
    //       insert: insert,
    //     },
    //   }
    //   const repeated = await unrepeat(this, curDoc, curConfig)
    //   if (repeated.length === 0)
    //     return new ResultFault('添加失败,当前数据已存在')
    // }
    // 补充公共属性
    // if (extensionInfo) {
    //   const { info, schemaId } = extensionInfo
    //   if (schemaId) {
    //     const modelSchema = new ModelSchema(
    //       this['mongoClient'],
    //       this['bucket'],
    //       this['client']
    //     )
    //     const publicSchema = await modelSchema.bySchemaId(schemaId)
    //     Object.keys(publicSchema).forEach((schema) => {
    //       doc[schema] = info[schema] ? info[schema] : ''
    //     })
    //   }
    // }
  }
}

export default Document
