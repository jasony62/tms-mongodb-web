import { PluginProfile } from 'tmw-data'
import { ModelDoc } from '..'

// 必须提供的属性
const RequiredProps = ['name', 'scope', 'title', 'description']

/**
 * 插件基类
 */
export abstract class PluginBase implements PluginProfile {
  file: string
  name: string // 插件名
  scope: string // 适用管理对象，支持：database，collection，document
  title: string // 插件按钮名称
  description: string // 插件描述信息
  excludeTags?: string[]
  everyTags?: string[]
  someTags?: string[]
  beforeWidget?: any
  transData?
  visible?
  disabled?: boolean
  remoteWidgetOptions?: Function

  /**
   * 创建插件
   * @param {string} file - 文件名
   */
  constructor(file) {
    if (typeof file !== 'string') throw '创建插件时未指定有效参数[file]'
    this.file = file
  }
  /**
   * 检查插件合规性，是否包含了必须的属性和方法
   */
  validate() {
    let pRequiredProps = RequiredProps.map((prop) => {
      return new Promise((resolve, reject) => {
        if (typeof this[prop] !== 'string' || !this[prop]) {
          reject(`插件文件[${this.file}]不可以，属性[${prop}]为空`)
        } else {
          resolve(true)
        }
      })
    })
    return Promise.all(pRequiredProps).then(() => {
      let { file, scope, execute } = this
      if (!['database', 'collection', 'document'].includes(scope))
        throw `插件文件[${file}]不可用，插件属性[scope=${scope}]无效`

      if (!execute || typeof execute !== 'function')
        throw `插件文件[${file}]不可用，创建的插件未包含[execute]方法`

      return true
    })
  }
  /**
   * 根据请求中的条件获得要发送的文档
   * @param {object} ctrl
   * @param {object} tmwCl
   *
   * @returns {[]} {[]} 第1位：是否成功，第2位：错误信息或文档列表
   */
  async findRequestDocs(ctrl, tmwCl) {
    let docs

    const modelDoc = new ModelDoc(ctrl.mongoClient, ctrl.bucket, ctrl.client)
    const { docIds, filter } = ctrl.request.body
    if (docIds && Array.isArray(docIds) && docIds.length > 0) {
      let [success, docsOrCause]: [boolean, any] = await modelDoc.byIds(
        tmwCl,
        docIds
      )
      if (success === true) docs = docsOrCause
      else return [false, docsOrCause]
    } else {
      let query
      if (typeof filter === 'string' && /all/i.test(filter)) {
        query = {}
      } else if (typeof filter === 'object' && Object.keys(filter).length) {
        query = filter
      }
      let [success, docsOrCause] = await modelDoc.list(tmwCl, {
        filter: query,
        orderBy: null,
      })
      //@ts-ignore
      if (success === true) docs = docsOrCause.docs
      else return [false, docsOrCause]
    }

    return [true, docs]
  }
  /**
   * 返回参见描述信息
   *
   * @returns {object} 插件的描述信息
   */
  get profile(): PluginProfile {
    const {
      name,
      scope,
      title,
      description,
      excludeTags,
      everyTags,
      someTags,
      beforeWidget,
      transData,
      disabled,
      visible,
    } = this

    return {
      name,
      scope,
      title,
      description,
      excludeTags,
      everyTags,
      someTags,
      beforeWidget,
      transData,
      disabled,
      visible,
    }
  }

  abstract execute(ctrl: any, tmwCl: any)
}
