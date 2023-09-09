import { ref, toRaw } from 'vue'
import { useAssistant } from './assistant.js'
import * as _ from 'lodash'

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
 * 执行数据转化操作
 * @param result
 * @param doc
 * @param transform
 */
const lookupTransform = (result: any, doc: any, transform: any) => {
  if (Array.isArray(transform) && transform.length) {
    transform.forEach((rule) => {
      let { src, dst } = rule
      let val = _.get(doc, src)
      _.set(result, dst, val)
    })
  } else result.id = doc._id
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
    const { beforeWidget, schemaJson } = plugin
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
              defaultHandleResponseRequired,
              applyAccessTokenField,
              reloadOnClose,
            } = data
            switch (action) {
              case 'Created':
                // 插件创建成功后，将插件信息传递给插件
                if (elPluginWidget.value) {
                  const msg: any = {
                    plugin: {
                      name: toRaw(plugin.name),
                      ui: toRaw(beforeWidget.ui),
                    },
                  }
                  if (schemaJson && typeof schemaJson === 'object') {
                    // 处理没有文档时，将后端指定的schema传递给插件
                    msg.schema = toRaw(schemaJson)
                  }
                  if (typeof onCreate === 'function') onCreate(plugin, msg)
                  elPluginWidget.value.contentWindow?.postMessage(msg, '*')
                }
                break
              case 'Cancel':
                window.removeEventListener('message', widgetResultListener)
                showPluginWidget.value = false
                break
              case 'Lookup':
                // 执行查询操作并返回结果
                let { target, lookup } = result.data
                if (lookup && typeof lookup === 'object') {
                  const { source, transform } = lookup
                  const resultListener = async (event: MessageEvent) => {
                    window.removeEventListener('message', resultListener)
                    const { data, origin } = event
                    if (data && typeof data === 'object') {
                      let { action, result } = data
                      if (action === 'extract.close') {
                        let lookuped: any = {}
                        let { dbName, clName, doc } = result
                        if (doc && typeof doc === 'object') {
                          doc._dbName = dbName
                          doc._clName = clName
                          lookupTransform(lookuped, doc, transform)
                        }
                        opened.value = false
                        elPluginWidget.value?.contentWindow?.postMessage(
                          {
                            lookup: { target, source, result: lookuped },
                          },
                          '*'
                        )
                      }
                    }
                  }
                  window.addEventListener('message', resultListener)
                  const { opened } = useAssistant({
                    extract: true,
                    multiple: false,
                    dbName,
                    clName: source?.cl,
                  })
                  opened.value = true
                }
                break
              case 'Execute':
                onExecute(
                  plugin,
                  docScope,
                  result,
                  handleResponse,
                  defaultHandleResponseRequired,
                  applyAccessTokenField
                )
                  .then((response: any) => {
                    if (handleResponse === true) {
                      // 将执行的结果递送给插件
                      if (elPluginWidget.value) {
                        elPluginWidget.value.contentWindow?.postMessage(
                          { response },
                          '*'
                        )
                      }
                    } else {
                      window.removeEventListener(
                        'message',
                        widgetResultListener
                      )
                      showPluginWidget.value = false
                    }
                  })
                  .catch(() => {
                    // 无法执行
                  })
                break
              case 'Close':
                window.removeEventListener('message', widgetResultListener)
                showPluginWidget.value = false
                // 关闭后刷新数据
                if (reloadOnClose && typeof onClose === 'function') onClose()
                break
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
