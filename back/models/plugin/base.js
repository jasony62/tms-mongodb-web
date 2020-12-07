/**插件基类 */
class PluginBase {
  /**
   * 返回参见描述信息
   *
   * @returns {object} 插件的描述信息
   */
  get profile() {
    const { name, scope, title, description } = this
    return { name, scope, title, description }
  }
}

module.exports = { PluginBase }
