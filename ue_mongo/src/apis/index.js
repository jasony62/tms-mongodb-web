import createBucket from './bucket.js'
import createDb from './database.js'
import createSchema from './schema.js'
import createCollection from './collection.js'
import createDoc from './document.js'
import createTag from './tag.js'
import createPlugin from './plugin.js'
import createReplica from './replica.js'

function init(options) {
  const api = {
    bucket: createBucket(options.tmsAxios.api),
    db: createDb(options.tmsAxios.api),
    schema: createSchema(options.tmsAxios.api),
    collection: createCollection(options.tmsAxios.api),
    doc: createDoc(options.tmsAxios.api),
    tag: createTag(options.tmsAxios.api),
    plugin: createPlugin(options.tmsAxios.api),
    replica: createReplica(options.tmsAxios.api),
  }
  return {
    api,
    ...api,
  }
}

export default function install(Vue, options) {
  Vue.$apis = init(options)
  Vue.prototype.$apis = Vue.$apis
}
