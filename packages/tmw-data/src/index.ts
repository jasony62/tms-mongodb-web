/**
 * 插件定义
 */
export interface PluginProfile {
  /**
   * 插件名称
   */
  name: string
  /**
   * 适用管理对象
   * database/collection/document
   */
  scope: string
  /**
   * 插件操作显示名称
   */
  title: string
  /**
   * 插件描述信息
   */
  description: string
  /**
   * 是否已禁用
   */
  disabled?: boolean
  /**
   * 是否显示插件
   */
  visible?: any
  /**
   * 需要的数据
   * nothing/one
   */
  transData?: string
  /**
   * 管理对象中不允许包含的标签的名称数组
   */
  excludeTags?: string[]
  /**
   * 管理对象中必须包含所有标签的名称数据
   */
  everyTags?: string[]
  /**
   * 管理对象中包含某个标签的名称数据
   */
  someTags?: string[]
  /**
   * 调用前执行的前端插件，用于输入条件。
   */
  beforeWidget?: {
    /**
     * 前端内置插件名称
     */
    name: string
    /**
     *
     */
    remoteWidgetOptions?: any
  }
}
