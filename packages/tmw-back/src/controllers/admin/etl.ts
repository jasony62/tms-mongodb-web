import { ResultData, ResultFault } from 'tms-koa'
import { Base, Helper } from 'tmw-kit/dist/ctrl/index.js'
import { EtlModel, EtlRunner } from 'tmw-kit'
import * as mongodb from 'mongodb'

const ObjectId = mongodb.ObjectId

class EtlHelper extends Helper {}

class Etl extends Base {
  modelEtl
  etlHelper

  constructor(ctx, client, dbContext, mongoClient, pushContext, fsContext?) {
    super(ctx, client, dbContext, mongoClient, pushContext, fsContext)
    this.modelEtl = new EtlModel(this.mongoClient, this.bucket, this.client)
    this.etlHelper = new EtlHelper(this)
  }
  /**
   * 查找和目的集合以及操作意图匹配的定义
   */
  async findForDst() {
    let { bucket, db, cl, scope } = this.request.query
    let [ok, result] = await this.modelEtl.list({ db, coll: cl }, scope)

    if (ok !== true) return new ResultFault(result)

    return new ResultData(result)
  }
  /**
   * 根据指定的etl规则和源数据返回转换结果
   */
  async transform() {
    let { etlid } = this.request.query
    if (!etlid || typeof etlid !== 'string')
      return new ResultFault('没有提供参数etlid')

    // 从数据库中获取转换规则数据
    let etlRunner = await EtlRunner.create(this, etlid)
    let etlRules = etlRunner.rules

    // 源数据集合
    const srcCl = await this.etlHelper.findRequestCl(
      false,
      etlRunner.source.db,
      etlRunner.source.coll
    )
    if (!srcCl) return new ResultFault('数据转换规则指定的源集合不存在')

    let { docIds } = this.request.body
    if (!Array.isArray(docIds) || docIds.length === 0)
      return new ResultFault('没有提供参数docIds')

    // 从数据库中获得源数据
    let docIds2 = docIds.map((id) => new ObjectId(id))
    let query = { _id: { $in: docIds2 } }

    // 集合数据
    let docs = await this.mongoClient
      .db(srcCl.db.sysname)
      .collection(srcCl.sysname)
      .find(query)
      .toArray()

    // 执行数据转化并返回结果
    const result = await etlRunner.run(docs)

    return new ResultData(result)
  }
}

export default Etl
