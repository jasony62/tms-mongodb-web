import { ref } from 'vue'

const opened = ref(false)

const url = ref('')

type UseAssistantOptions = {
  compact?: boolean
  extract?: boolean
  multiple?: boolean
  dbName?: string
  clName?: string
}

export const useAssistant = (options?: UseAssistantOptions) => {
  options ??= { compact: true, extract: false, dbName: '', clName: '' }

  let params = []
  if (options.compact !== false) params.push('compact=Y')
  if (options.extract === true) params.push('extract=Y')
  if (options.multiple === false) params.push('multiple=N')

  let { dbName, clName } = options
  let path
  if (dbName && typeof dbName === 'string') {
    if (clName && typeof clName === 'string') {
      path = `/admin/collection/${dbName}/${clName}`
    }
  }
  path ??= '/admin/database/'

  url.value = path + (params.length ? '?' + params.join('&') : '')

  return { opened, url }
}
