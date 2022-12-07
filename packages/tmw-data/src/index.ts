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
   * zero,one,many
   */
  amount?: string
  /**
   * 和存储空间名称匹配的正则表达式
   */
  bucketName?: RegExp
  /**
   * 和数据库名称匹配的正则表达式
   */
  dbName?: RegExp
  /**
   * 和集合名称匹配的正则表达式
   */
  clName?: RegExp
  /**
   * 和文档列定义名称匹配的正则表达式
   */
  schemaName?: RegExp
  /**
   * 账号管理指定集合schema文件
   */
  schemaJson?: any
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
     * 当值为external时，为外置自定义部件
     */
    name: string
    /**
     * 内置区间是否需要远程参数
     */
    remoteWidgetOptions?: boolean
    /**
     * 自定义部件的打开地址
     */
    url?: string
    /**
     * 自定义部分显示宽度
     */
    size?: string
    /**
     * 携带的其它信息
     */
    [k: string]: any
  }
  /**
   * 内置部件参数
   */
  remoteWidgetOptions?: Function
}
