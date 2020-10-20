import createBucket from './bucket'
import createDb from './database'
import createSchema from './schema'
import createCollection from './collection'
import createDoc from './document'
import createTag from './tag'
import createPlugin from './plugin'

function init(options) {
  return {
    api: {
      bucket: createBucket(options.tmsAxios.api),
      db: createDb(options.tmsAxios.api),
      schema: createSchema(options.tmsAxios.api),
      collection: createCollection(options.tmsAxios.api),
      doc: createDoc(options.tmsAxios.api),
      tag: createTag(options.tmsAxios.api),
      plugin: createPlugin(options.tmsAxios.api),
    }
  }
}

export default function install(Vue, options) {
  Vue.$apis = init(options)
  Vue.prototype.$apis = Vue.$apis
}
