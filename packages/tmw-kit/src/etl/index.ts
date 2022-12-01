import { JSONPath } from 'jsonpath-plus'
import * as _ from 'lodash'
import Base from '../model/base'
import { ModelCl, ModelDoc } from '../model'
/**
 * 数据库
 */
const ETL_DB_NAME = process.env.TMW_APP_ETL_DB || 'tmw_app'
/**
 * 集合
 */
const ETL_CL_NAME = process.env.TMW_APP_ETL_CL || 'etl'

enum TransformScope {
  Collection = 'collection',
  Document = 'document',
}

type TransformRule = {
  dst: string
  src: string
  default?: any
}

export class EtlModel extends Base {
  /**
   * 适用于目的集合的规则
   * @param dst
   * @param scope 适用对象类型
   */
  async list(dst: any, scope: TransformScope) {
    const modelCl = new ModelCl(this.mongoClient, this.bucket, this.client)
    const etlCl = await modelCl.byName(ETL_DB_NAME, ETL_CL_NAME)
    if (!etlCl) throw Error('数据转换规则数据库结合不存在')

    const filter: any = {
      'destination.db': dst.db,
      'destination.coll': dst.coll,
      scope,
    }
    const modelDoc = new ModelDoc(this.mongoClient, this.bucket, this.client)
    const [ok, result] = await modelDoc.list(etlCl, { filter }, {}, false)

    if (ok === false) return [false, result]

    return [true, result.docs]
  }
}

export class EtlRunner {
  _rawDoc

  constructor(rawDoc) {
    this._rawDoc = rawDoc
  }

  get destination() {
    return this._rawDoc.destination
  }

  get source() {
    return this._rawDoc.source
  }

  get rules(): TransformRule[] {
    return this._rawDoc.rules
  }
  /**
   *
   * @param doc
   * @returns
   */
  private singleDoc(doc: any) {
    let target = {}
    this.rules.forEach((rule) => {
      let { src, dst } = rule
      let val = JSONPath({ path: src, json: doc })
      if (val.length == 1) {
        _.set(target, dst, val[0])
      } else if (rule.default !== undefined && rule.default !== null) {
        _.set(target, dst, rule.default)
      }
    })
    return target
  }
  /**
   *
   * @param srcDoc
   * @returns
   */
  async run(srcDoc: any) {
    let target
    if (Array.isArray(srcDoc)) {
      target = srcDoc.map((doc) => this.singleDoc(doc))
    } else {
      target = this.singleDoc(srcDoc)
    }

    return target
  }
  /**
   * 根据id从数据库中获取数据转换规则
   * @param id
   */
  static async create(ctrl, id: string) {
    const modelCl = new ModelCl(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const etlCl = await modelCl.byName(ETL_DB_NAME, ETL_CL_NAME)
    if (!etlCl) throw Error('数据转换规则数据库结合不存在')

    const modelDoc = new ModelDoc(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const etl = await modelDoc.byId(etlCl, id)
    if (!etl) throw Error('指定的数据转换规则不存在')

    const runner = new EtlRunner(etl)

    return runner
  }
}
