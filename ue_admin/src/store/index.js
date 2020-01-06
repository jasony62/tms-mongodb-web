import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

import apis from '../apis'

export default new Vuex.Store({
  state: {
    dbs: [],
    schemas: [],
    collections: [],
    documents: []
  },
  mutations: {
    dbs(state, payload) {
      state.dbs = payload.dbs
    },
    appendDatabase(state, payload) {
      state.dbs.push(payload.db)
    },
    updateDatabase() {},
    removeDatabase(state, payload) {
      state.dbs.splice(state.dbs.indexOf(payload.db), 1)
    },
    schemas(state, payload) {
      state.schemas = payload.schemas
    },
    appendSchema(state, payload) {
      state.schemas.push(payload.schema)
    },
    updateSchema() {},
    removeSchema(state, payload) {
      state.schemas.splice(state.schemas.indexOf(payload.schema), 1)
    },
    collections(state, payload) {
      state.collections = payload.collections
    },
    appendCollection(state, payload) {
      state.collections.push(payload.collection)
    },
    updateCollection() {},
    removeCollection(state, payload) {
      state.collections.splice(state.collections.indexOf(payload.collection), 1)
    },
    documents(state, payload) {
      state.documents = payload.documents
    },
    appendDocument(state, payload) {
      state.documents.push(payload.document)
    },
    updateDocument() {},
    removeDocument(state, payload) {
      state.documents.splice(state.documents.indexOf(payload.document), 1)
    }
  },
  actions: {
    listDatabase({ commit }) {
      return apis.db.list().then(dbs => {
        commit({ type: 'dbs', dbs })
        return { dbs }
      })
    },
    listSchema({ commit }) {
      return apis.schema.list().then(schemas => {
        commit({ type: 'schemas', schemas })
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
      const { db, collection } = payload
      return apis.doc.list(db, collection).then(result => {
        const documents = result.docs
        commit({ type: 'documents', documents })
        return { documents }
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
      const { schema } = playload
      return apis.schema.remove(schema).then(() => {
        commit({ type: 'removeSchema', schema })
        // return { schema }
      })
    },
    removeCollection({ commit }, payload) {
      const { db, collection } = payload
      return apis.collection.remove(db, collection.name).then(() => {
        commit({ type: 'removeCollection', collection })
        // return { collection }
      })
    },
    removeDocument({ commit }, payload) {
      const { dbName, clName, id, document } = payload
      return apis.doc.remove(dbName, clName, id).then(() => {
        commit({ type: 'removeDocument', document })
        // return { document }
      })
    }
  },
  modules: {}
})
