import { ref, toRaw } from 'vue'

const elPluginWidget = ref<HTMLIFrameElement>()

const showPluginWidget = ref(false)

const pluginWidgetUrl = ref('')

const pluginWidgetSize = ref('')

export type UseTmwPluginsOptions = {
  bucketName?: string
  dbName?: string
  clName?: string
  onExecute?: any
  onCreate?: any
  onClose?: any
}
/**
 *
 * @param options
 * @returns
 */
export const useTmwPlugins = (options?: UseTmwPluginsOptions) => {
  const { bucketName, dbName, clName, onExecute, onCreate, onClose } =
    options ?? {}
  /**
   * 执行插件
   *
   * @param plugin 要执行的插件
   * @param docScope 插件操作数据的范围
   */
  const handlePlugin = (plugin: any, docScope = '') => {
    const { beforeWidget, schemaJson: schema } = plugin
    if (beforeWidget) {
      const { name, url, size } = beforeWidget
      if (name === 'external' && url) {
        let fullurl = url + (url.indexOf('?') > 0 ? '&' : '?')
        showPluginWidget.value = true
        pluginWidgetUrl.value =
          fullurl + `bucket=${bucketName ?? ''}&db=${dbName}&cl=${clName}`
        pluginWidgetSize.value = size ?? '50%'
        // 收集页面数据
        const widgetResultListener = (event: MessageEvent) => {
          const { data, origin } = event
          if (data) {
            const {
              action,
              result,
              handleResponse,
              applyAccessTokenField,
              reloadOnClose,
            } = data
            if (action === 'Created') {
              // 插件创建成功后，将插件信息传递给插件
              if (elPluginWidget.value) {
                const msg: any = {
                  plugin: {
                    name: toRaw(plugin.name),
                    ui: toRaw(beforeWidget.ui),
                  },
                }
                if (plugin.amount === 'zero') {
                  // 处理没有文档时，将后端指定的schema传递给插件
                  msg.schema = toRaw(schema)
                }
                if (typeof onCreate === 'function') onCreate(plugin, msg)
                elPluginWidget.value.contentWindow?.postMessage(msg, '*')
              }
            } else if (action === 'Cancel') {
              window.removeEventListener('message', widgetResultListener)
              showPluginWidget.value = false
            } else if (action === 'Execute') {
              onExecute(
                plugin,
                docScope,
                result,
                handleResponse,
                applyAccessTokenField
              ).then((response: any) => {
                if (handleResponse === true) {
                  // 将执行的结果递送给插件
                  if (elPluginWidget.value) {
                    elPluginWidget.value.contentWindow?.postMessage(
                      { response },
                      '*'
                    )
                  }
                } else {
                  window.removeEventListener('message', widgetResultListener)
                  showPluginWidget.value = false
                }
              })
            } else if (action === 'Close') {
              window.removeEventListener('message', widgetResultListener)
              showPluginWidget.value = false
              // 关闭后刷新数据
              if (reloadOnClose && typeof onClose === 'function') onClose
            }
          }
        }
        window.addEventListener('message', widgetResultListener)
        return
      }
    } else {
      onExecute(plugin, docScope)
    }
  }

  return {
    handlePlugin,
    elPluginWidget,
    showPluginWidget,
    pluginWidgetUrl,
    pluginWidgetSize,
  }
}
