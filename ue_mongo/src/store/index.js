import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    buckets: [],
    dbs: [],
    collections: [],
    documents: [],
    schemas: [],
    rules: [],
    conditions: []
  },
  mutations: {
    buckets(state, payload) {
      state.buckets = payload.buckets
    },
    dbs(state, payload) {
      state.dbs = payload.dbs
    },
    appendDatabase(state, payload) {
      state.dbs.push(payload.db)
    },
    updateDatabase() { },
    schemas(state, payload) {
      state.schemas = payload.schemas
    },
    collections(state, payload) {
      state.collections = payload.collections
    },
    appendCollection(state, payload) {
      state.collections.push(payload.collection)
    },
    updateCollection() { },
    documents(state, payload) {
      state.documents = payload.documents
    },
    appendDocument(state, payload) {
      state.documents.push(payload.document)
    },
    updateDocument() { },
    removeDocument(state, payload) {
      state.documents.splice(state.documents.indexOf(payload.document), 1)
    },
    conditionAddColumn(state, payload) {
      const { condition } = payload
      const index = state.conditions.findIndex(
        ele => ele.columnName === condition.columnName
      )
      if (index !== -1) {
        state.conditions.splice(index, 1)
      }
      condition.rule.filter = { [condition.columnName]: condition.rule.filter[condition.columnName] }
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
    listBuckets({ commit }) {
      return new Promise(resolve => {
        Vue.$apis.api.bucket.list().then(buckets => {
          commit({ type: 'buckets', buckets })
          resolve(buckets)
        })
      })
    },
    listDatabase({ commit }, payload) {
      const { bucket } = payload
      return new Promise(resolve => {
        Vue.$apis.api.db.list(bucket).then(dbs => {
          commit({ type: 'dbs', dbs })
          resolve({ dbs })
        })
      })
    },
    listCollection({ commit }, payload) {
      const { bucket, db } = payload
      return new Promise(resolve => {
        Vue.$apis.api.collection.list(bucket, db).then(collections => {
          commit({ type: 'collections', collections })
          resolve({ collections })
        })
      })
    }
  },
  modules: {}
})
