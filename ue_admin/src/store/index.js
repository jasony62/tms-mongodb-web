import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

import apiDb from '../apis/database'
import apiCollection from '../apis/collection'
import apiDocument from '../apis/document'

export default new Vuex.Store({
  state: {
    dbs: [],
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
      return new Promise(resolve => {
        apiDb.list().then(dbs => {
          commit({ type: 'dbs', dbs })
          resolve({ dbs })
        })
      })
    },
    listCollection({ commit }, payload) {
      let { db } = payload
      return new Promise(resolve => {
        apiCollection.list(db).then(collections => {
          commit({ type: 'collections', collections })
          resolve({ collections })
        })
      })
    },
    listDocument({ commit }, payload) {
      let { db, collection } = payload
      return new Promise(resolve => {
        apiDocument.list(db, collection).then(documents => {
          commit({ type: 'documents', documents })
          resolve({ documents })
        })
      })
    }
  },
  modules: {}
})
