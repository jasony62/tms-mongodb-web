import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

import apis from '../apis.js'

export default new Vuex.Store({
  state: {
    buckets: [],
    dbs: [],
    dbSchemas: [],
    collectionSchemas: [],
    collections: [],
    conditions: [],
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
    conditionAddColumn(state, payload) {
      const { condition } = payload
      const index = state.conditions.findIndex(
        (ele) => ele.columnName === condition.columnName
      )
      if (index !== -1) {
        state.conditions.splice(index, 1)
      }
      state.conditions.push(condition)
    },
    conditionDelBtn(state, payload) {
      const { columnName } = payload
      state.conditions.forEach((ele) => {
        if (ele.columnName !== columnName) {
          ele.rule.orderBy = {}
          ele.isCheckBtn = [true, true]
        }
      })
    },
    conditionDelColumn(state, payload) {
      const { condition } = payload
      const index = state.conditions.findIndex(
        (ele) => ele.columnName === condition.columnName
      )
      if (index !== -1) {
        state.conditions.splice(index, 1)
      }
    },
    conditionReset(state) {
      state.conditions = []
    },
  },
  actions: {
    listBucket({ commit }) {
      return apis.bucket.list().then((buckets) => {
        commit({ type: 'buckets', buckets })
        return { buckets }
      })
    },
    listDatabase({ commit }, payload) {
      const { bucket } = payload
      return apis.db.list(bucket).then((dbs) => {
        commit({ type: 'dbs', dbs })
        return { dbs }
      })
    },
    listSchema({ commit }, payload) {
      const { bucket, scope } = payload
      return apis.schema.list(bucket, scope).then((schemas) => {
        commit({ type: 'schemas', schemas, scope })
        return { schemas }
      })
    },
    listCollection({ commit }, payload) {
      const { bucket, db } = payload
      return apis.collection.list(bucket, db).then((collections) => {
        commit({ type: 'collections', collections })
        return { collections }
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
  },
  modules: {},
})
