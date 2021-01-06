import Vue from 'vue'
import Vuex from 'vuex'
import { startBatch } from 'tms-vue'

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
    updateDatabase(state, payload) {
      state.dbs.splice(state.dbs.indexOf(payload.index), 1, payload.db)
    },
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
      const { documents } = payload
      const formatDocs = documents.map(item => {
        Object.keys(item).forEach(key => {
          if (typeof item[key] === 'string') item[key] = item[key].trim()
        })
        return item
      })
      state.documents = formatDocs
    },
    appendDocument(state, payload) {
      state.documents.push(payload.document)
    },
    updateDocument() {},
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
      const { bucket, size, keyword } = payload
      return startBatch(
        function(keyword, batchArg) {
          return Vue.$apis.api.db
            .list(bucket, { keyword, ...batchArg })
            .then(result => {
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
    listCollection({ commit }, payload) {
      const { bucket, db, size, keyword } = payload
      return startBatch(
        function(keyword, batchArg) {
          return Vue.$apis.api.collection
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
    removeDatabase({ commit }, payload) {
      const { bucket, db } = payload
      return new Promise(resolve => {
        Vue.$apis.api.db.remove(bucket, db).then(() => {
          commit({ type: 'removeDatabase', db })
          resolve({ db })
        })
      })
    },
    removeCollection({ commit }, payload) {
      const { bucket, db, collection } = payload
      return new Promise(resolve => {
        Vue.$apis.api.collection
          .remove(bucket, db, collection.name)
          .then(() => {
            commit({ type: 'removeCollection', collection })
            resolve({ collection })
          })
      })
    }
  },
  modules: {}
})
