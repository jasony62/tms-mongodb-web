import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

import apis from '../apis'
import { startBatch } from 'tms-vue'

export default new Vuex.Store({
  state: {
    buckets: [],
    dbs: [],
    documentSchemas: [],
    dbSchemas: [],
    collectionSchemas: [],
    collections: [],
    tags: [],
    documents: [],
    conditions: [],
    replicas: []
  },
  mutations: {
    buckets(state, payload) {
      state.buckets = payload.buckets
    },
    appendBucket(state, payload) {
      state.buckets.push(payload.bucket)
    },
    updateBucket(state, payload) {
      const { index, bucket } = payload
      state.buckets.splice(index, 1, bucket)
    },
    removeBucket(state, payload) {
      state.buckets.splice(state.buckets.indexOf(payload.bucket), 1)
    },
    dbs(state, payload) {
      state.dbs = payload.dbs
    },
    appendDatabase(state, payload) {
      state.dbs.push(payload.db)
    },
    updateDatabase(state, payload) {
      const { index, db } = payload
      state.dbs.splice(index, 1, db)
    },
    removeDatabase(state, payload) {
      state.dbs.splice(state.dbs.indexOf(payload.db), 1)
    },
    schemas(state, payload) {
      const { schemas, scope } = payload
      state[`${scope}Schemas`] = schemas
    },
    appendSchema(state, payload) {
      const { schema } = payload
      state[`${schema.scope}Schemas`].push(schema)
    },
    updateSchema(state, payload) {
      const { index, schema } = payload
      state[`${schema.scope}Schemas`].splice(index, 1, schema)
    },
    removeSchema(state, payload) {
      const { schema } = payload
      const scopeSchemas = state[`${schema.scope}Schemas`]
      scopeSchemas.splice(scopeSchemas.indexOf(schema), 1)
    },
    collections(state, payload) {
      state.collections = payload.collections
    },
    appendCollection(state, payload) {
      state.collections.push(payload.collection)
    },
    updateCollection(state, payload) {
      const { index, collection } = payload
      state.collections.splice(index, 1, collection)
    },
    removeCollection(state, payload) {
      state.collections.splice(state.collections.indexOf(payload.collection), 1)
    },
    documents(state, payload) {
      state.documents = payload.documents
    },
    updateDocument() {},
    conditionAddColumn(state, payload) {
      const { condition } = payload
      const index = state.conditions.findIndex(
        ele => ele.columnName === condition.columnName
      )
      if (index !== -1) {
        state.conditions.splice(index, 1)
      }
      condition.rule.filter = {
        [condition.columnName]: condition.rule.filter[condition.columnName]
      }
      state.conditions.push(condition)
    },
    conditionDelBtn(state, payload) {
      const { columnName } = payload
      state.conditions.forEach(ele => {
        if (ele.columnName !== columnName) {
          ele.rule.orderBy = {}
          ele.isCheckBtn = [true, true]
        }
      })
    },
    conditionDelColumn(state, payload) {
      const { condition } = payload
      const index = state.conditions.findIndex(
        ele => ele.columnName === condition.columnName
      )
      if (index !== -1) {
        state.conditions.splice(index, 1)
      }
    },
    conditionReset(state) {
      state.conditions = []
    },
    tags(state, payload) {
      state.tags = payload.tags
    },
    appendTag(state, payload) {
      state.tags.push(payload.tag)
    },
    updateTag(state, payload) {
      const { index, tag } = payload
      state.tags.splice(index, 1, tag)
    },
    removeTag(state, payload) {
      state.tags.splice(state.tags.indexOf(payload.tag), 1)
    },
    replicas(state, payload) {
      state.replicas = payload.replicas
    },
    appendReplica(state, payload) {
      state.replicas.push(payload.replica)
    },
    removeReplica(state, payload) {
      state.replicas.splice(state.replicas.indexOf(payload.params), 1)
    }
  },
  actions: {
    listBucket({ commit }) {
      return apis.bucket.list().then(buckets => {
        commit({ type: 'buckets', buckets })
        return { buckets }
      })
    },
    listDatabase({ commit }, payload) {
      const { bucket, keyword, size } = payload
      return startBatch(
        function(keyword, batchArg) {
          return apis.db.list(bucket, { keyword, ...batchArg }).then(result => {
            commit({ type: 'dbs', dbs: result.databases })
            return result
          })
        },
        [keyword],
        {
          size: size
        }
      )
    },
    listSchema({ commit }, payload) {
      const { bucket, scope } = payload
      return apis.schema.list(bucket, scope).then(schemas => {
        commit({ type: 'schemas', schemas, scope })
        return { schemas }
      })
    },
    listCollection({ commit }, payload) {
      const { bucket, db, size, keyword } = payload
      return startBatch(
        function(keyword, batchArg) {
          return apis.collection
            .list(bucket, db, { keyword, ...batchArg })
            .then(result => {
              commit({ type: 'collections', collections: result.collections })
              return result
            })
        },
        [keyword],
        {
          size: size
        }
      )
    },
    listDocument({ commit }, payload) {
      const { bucket, db, cl, orderBy, filter, page } = payload
      return apis.doc
        .list(bucket, db, cl, orderBy, filter, page)
        .then(result => {
          const documents = result.docs
          commit({ type: 'documents', documents })
          return result
        })
    },
    removeBucket({ commit }, payload) {
      const { bucket } = payload
      return apis.bucket.remove(bucket).then(() => {
        commit({ type: 'removeBucket', bucket })
      })
    },
    removeDb({ commit }, payload) {
      const { bucket, db } = payload
      return apis.db.remove(bucket, db).then(() => {
        commit({ type: 'removeDatabase', db })
        return { db }
      })
    },
    removeSchema({ commit }, playload) {
      const { bucket, schema } = playload
      return apis.schema.remove(bucket, schema).then(() => {
        commit({ type: 'removeSchema', schema })
        return { schema }
      })
    },
    removeCollection({ commit }, payload) {
      const { bucket, db, collection } = payload
      return apis.collection.remove(bucket, db, collection.name).then(() => {
        commit({ type: 'removeCollection', collection })
        return { collection }
      })
    },
    listTag({ commit }, payload) {
      const { bucket } = payload
      return apis.tag.list(bucket).then(tags => {
        commit({ type: 'tags', tags })
        return { tags }
      })
    },
    removeTag({ commit }, payload) {
      const { bucket, tag } = payload
      return apis.tag.remove(bucket, tag).then(() => {
        commit({ type: 'removeTag', tag })
        return { tag }
      })
    },
    listReplica({ commit }, payload) {
      const { bucket, size, keyword } = payload
      return startBatch(
        function(keyword, batchArg) {
          return apis.replica
            .list(bucket, { keyword, ...batchArg })
            .then(result => {
              result.replicas = result.replicas.map(result => {
                let {
                  primary: { db: pdb, cl: pcl },
                  secondary: { db: sdb, cl: scl }
                } = result
                ;[pdb, pcl, sdb, scl].forEach(item => {
                  item.label = `${item.title} (${item.name})`
                })
                return {
                  primary: { db: pdb, cl: pcl },
                  secondary: { db: sdb, cl: scl }
                }
              })
              commit({ type: 'replicas', replicas: result.replicas })
              return result
            })
        },
        [keyword],
        {
          size: size
        }
      )
    },
    removeReplica({ commit }, payload) {
      const { bucket, params } = payload
      return apis.replica.remove(bucket, params).then(() => {
        commit({ type: 'removeReplica', params })
        return { params }
      })
    },
    syncReplica({}, payload) {
      const { bucket, params } = payload
      return apis.replica.synchronize(bucket, params)
    },
    synchronizeAll({}, payload) {
      const { bucket, params } = payload
      let result = { success: [], error: [] }
      for (const param of params) {
        let transfer = {
          primary: {
            db: param.primary.db.name,
            cl: param.primary.cl.name
          },
          secondary: {
            db: param.secondary.db.name,
            cl: param.secondary.cl.name
          }
        }
        apis.replica
          .synchronize(bucket, transfer)
          .then(() => {
            result.success.push(param)
          })
          .catch(() => {
            result.error.push(param)
          })
      }
      return result
    }
  },
  modules: {}
})
