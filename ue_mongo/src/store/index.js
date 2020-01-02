import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

import apis from '../apis'

export default new Vuex.Store({
  state: {
    dbs: [],
    collections: [],
    documents: [],
    schemas: [],
    rules: []
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
    listCollection({ commit }, payload) {
      const { db } = payload
      return apis.collection.list(db).then(collections => {
        commit({ type: 'collections', collections })
        return { collections }
      })
    },
    listDocument({ commit }, payload) {
      const { db, cl, page, filter } = payload
      return apis.doc.list(db, cl, page, filter).then(result => {
        const documents = result.docs
        commit({ type: 'documents', documents })
        return {  result }
      })
    },
    removeCollection({ commit }, payload) {
      const { db, collection } = payload
      apis.collection.remove(db, collection.name).then(() => {
        commit({ type: 'removeCollection', collection })
        return { collection }
      })
    }
  },
  modules: {}
})
