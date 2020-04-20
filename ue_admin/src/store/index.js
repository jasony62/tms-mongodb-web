import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

import apis from '../apis'

export default new Vuex.Store({
  state: {
    buckets: [],
    dbs: [],
    schemas: [],
    collections: [],
    documents: [],
    attributes: [],
    conditions: []
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
      const { schemas, types } = payload
      state[types] = schemas
    },
    appendSchema(state, payload) {
      const { schema, type } = payload
      state[type + 's'].push(schema)
    },
    updateSchema(state, payload) {
      const { index, schema, type } = payload
      state[type + 's'].splice(index, 1, schema)
    },
    removeSchema(state, payload) {
      const { schema, types } = payload
      state[types + 's'].splice(state[types + 's'].indexOf(schema), 1)
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
    }
  },
  actions: {
    listBucket({ commit }) {
      return apis.bucket.list().then(buckets => {
        commit({ type: 'buckets', buckets })
        return { buckets }
      })
    },
    listDatabase({ commit }) {
      return apis.db.list().then(dbs => {
        commit({ type: 'dbs', dbs })
        return { dbs }
      })
    },
    listSchema({ commit }, payload) {
      const { scope } = payload
      return apis.schema.list(scope).then(schemas => {
        const types = typeof scope === 'string' ? 'schemas' : 'attributes'
        commit({ type: 'schemas', schemas, types })
        return { schemas }
      })
    },
    listCollection({ commit }, payload) {
      const { db } = payload
      return apis.collection.list(db).then(collections => {
        commit({ type: 'collections', collections })
        return { collections }
      })
    },
    listDocument({ commit }, payload) {
      const { db, cl, orderBy, filter, page } = payload
      return apis.doc.list(db, cl, orderBy, filter, page).then(result => {
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
      const { db } = payload
      return apis.db.remove(db).then(() => {
        commit({ type: 'removeDatabase', db })
        // return { db }
      })
    },
    removeSchema({ commit }, playload) {
      const { schema, type } = playload
      return apis.schema.remove(schema).then(() => {
        commit({ type: 'removeSchema', schema, types: type })
        // return { schema }
      })
    },
    removeCollection({ commit }, payload) {
      const { db, collection } = payload
      return apis.collection.remove(db, collection.name).then(() => {
        commit({ type: 'removeCollection', collection })
        // return { collection }
      })
    }
  },
  modules: {}
})
