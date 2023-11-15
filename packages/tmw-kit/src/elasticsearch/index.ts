import { URL } from 'node:url'
import log4js from '@log4js-node/log4js-api'
import Debug from 'debug'

const logger = log4js.getLogger('tms-mongodb-web')
const debug = Debug('tmw-kit:elasticsearch')
/**
 * 默认的分析器
 */
const ES_ANALYZER = process.env.TMW_ELASTICSEARCH_ANALYZER || 'ik_max_word'
/**
 * Elasticsearch的Index对象
 */
export class ElasticSearchIndex {
  private _indexUri: URL
  constructor(private _name: string) {
    this._indexUri = new URL(`/${_name}`, process.env.TMW_ELASTICSEARCH_URI)
  }
  get name() {
    return this._name
  }
  get indexUri() {
    return this._indexUri
  }
  /**
   * 配置es索引
   *
   * @param config 要符合Elasticsearch Create Index API中Request body的定义
   * @returns
   */
  async configure(config: any) {
    let result = false
    const rsp = await fetch(this.indexUri)
    const { status, statusText } = rsp
    if (rsp.ok) {
      /**
       * 索引已经存在，做更新操作
       */
      const { mappings } = config
      if (mappings && typeof mappings === 'object') {
        const mappingUrl = new URL(this.indexUri.toString() + '/_mapping')
        const rsp = await fetch(mappingUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mappings),
        })
        if (rsp.ok) {
          result = true
          const msg = `设置索引【${this.name}】成功`
          logger.info(msg)
        } else {
          const msg = `设置索引【${this.name}】失败，原因：${rsp.statusText}`
          debug(
            `${msg}，\nURL：%s\n提交数据：%O`,
            mappingUrl.toString(),
            mappings
          )
          logger.error(msg)
        }
      }
    } else if (rsp.status === 404) {
      /**
       * 索引不存在，创建索引
       */
      const rsp = await fetch(this.indexUri, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (rsp.ok) result = true
      else logger.error(`设置索引【${this.name}】失败，原因：${rsp.statusText}`)
    } else {
      logger.error(`设置索引【${this.name}】失败，原因：${rsp.statusText}`)
    }

    return result
  }
  /**
   * 新建es文档
   *
   * @param id
   * @param doc
   * @returns
   */
  async createDocument(id: string, doc: any) {
    const url = new URL(this.indexUri.toString() + `/_doc/${id}`)
    const esDoc = { ...doc }
    // es不允许字段以下划线开头
    delete esDoc._id

    const rsp = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(esDoc),
    })
    if (!rsp.ok) {
      const msg = `新建文档【${this.name}/${id}】失败`
      debug(`${msg}，\nURL：%s\n提交数据：%O`, url.toString(), esDoc)
      logger.error(`${msg}，原因：${rsp.statusText}`)
      return false
    } else {
      debug(`新建文档【${this.name}/${id}】`)
    }
    return true
  }
  /**
   * 更新或插入es文档
   *
   * @param id
   * @param doc
   * @returns
   */
  async updateDocument(id: string, doc: any) {
    const url = new URL(this.indexUri.toString() + `/_update/${id}`)
    const rsp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc, doc_as_upsert: true }),
    })
    if (!rsp.ok) {
      const msg = `更新文档【${this.name}/${id}】失败`
      debug(`${msg}，\nURL：%s\n提交数据：%O`, url.toString(), doc)
      logger.error(`${msg}，原因：${rsp.statusText}`)
      return false
    } else {
      debug(`更新文档【${this.name}/${id}】`)
    }
    return true
  }
  /**
   * 删除es文档
   * @param id
   * @returns
   */
  async removeDocument(id: string) {
    const url = new URL(this.indexUri.toString() + `/_doc/${id}`)
    const rsp = await fetch(url, {
      method: 'DELETE',
    })
    if (!rsp.ok) {
      logger.error(
        `删除文档【${this.name}/${id}】失败，原因：${rsp.statusText}`
      )
      return false
    } else {
      debug(`删除文档【${this.name}/${id}】`)
    }
    return true
  }
  /**
   * 执行搜索
   * @param match
   */
  async search(match: Record<string, string>) {
    const url = new URL(this.indexUri.toString() + `/_search`)
    const rsp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { match } }),
    })
    if (!rsp.ok) {
      const msg = `全文检索【${this.name}】失败，原因：${rsp.statusText}`
      debug(`${msg}\n参数：\n` + JSON.stringify(match))
      logger.error(msg)
      return false
    }
    const rst = await rsp.json()
    const { hits } = rst

    const docs = hits?.hits.map((hit) => {
      const { _id, _source } = hit
      return { _id, ..._source }
    })

    return docs
  }
  /**
   * 是否配置了es服务
   * @returns
   */
  static available(): boolean {
    return !!process.env.TMW_ELASTICSEARCH_URI
  }
  /**
   * es分析器
   * @returns
   */
  static analyzer(): string {
    return ES_ANALYZER
  }
}
