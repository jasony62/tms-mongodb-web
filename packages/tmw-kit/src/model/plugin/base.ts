// 必须提供的属性
const RequiredProps = ['name', 'scope', 'title', 'description']
/**
 * 插件说明
 */
export interface PluginProfile {
  name: string
  scope: string
  title: string
  description: string
  excludeTags?: string[]
  everyTags?: string[]
  someTags?: string[]
  transData?: string
  beforeWidget?: any
  visible?: boolean
}

/**
 * 插件基类
 */
export class PluginBase implements PluginProfile {
  file: string
  name: string // 插件名
  scope: string // 适用管理对象，支持：database，collection，document
  title: string // 插件按钮名称
  description: string // 插件描述信息
  execute: Function
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
      visible,
    }
  }
}
