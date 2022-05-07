import { defineStore } from 'pinia'

import apis from '@/apis'
import { Batch, startBatch } from 'tms-vue3'
import { reactive } from 'vue'

type DbPayload = { bucket?: string; keyword?: string; size: number }

export default defineStore('mongodb', {
  state: () => {
    return {
      buckets: [],
      dbs: [] as any[],
      documentSchemas: [],
      dbSchemas: [],
      collectionSchemas: [],
      collections: [] as any,
      tags: [],
      documents: [],
      conditions: [],
      replicas: [],
    }
  },
  actions: {
    listBucket() {
      return apis.bucket.list().then((buckets: never[]) => {
        this.buckets = buckets
        return { buckets }
      })
    },
    appendBucket(payload: { bucket: any }) {
      this.buckets.push(payload.bucket)
    },
    updateBucket(payload: { index: any; bucket: any }) {
      const { index, bucket } = payload
      this.buckets.splice(index, 1, bucket)
    },
    removeBucket(payload: { bucket: any }) {
      const { bucket } = payload
      return apis.bucket.remove(bucket).then(() => {
        this.buckets.splice(this.buckets.indexOf(bucket), 1)
      })
    },
    listDatabase(payload: DbPayload): Batch {
      let action = (bucket: string, keyword: string, batchArg: any) => {
        return apis.db
          .list(bucket, keyword, batchArg)
          .then(
            (result: {
              databases: { _id: string; title: string; description: string }[]
            }) => {
              this.dbs = result.databases
              return result
            }
          )
      }
      const { bucket, keyword, size } = payload
      return startBatch(action, [bucket, keyword], {
        size,
        wrap: reactive,
      })
    },
    appendDatabase(payload: {
      db: { _id: string; title: string; description: string }
    }) {
      this.dbs.splice(0, 0, payload.db)
    },
    updateDatabase(payload: { index: any; db: any }) {
      const { index, db } = payload
      this.dbs.splice(index, 1, db)
    },
    removeDb(payload: { bucket: any; db: any }) {
      const { bucket, db } = payload
      return apis.db.remove(bucket, db).then(() => {
        this.dbs.splice(this.dbs.indexOf(db), 1)
        return { db }
      })
    },
    listSchema(payload: { bucket: any; scope: any }) {
      const { bucket, scope } = payload
      return apis.schema.list(bucket, scope).then((schemas: any) => {
        this[`${scope}Schemas`] = schemas
        return { schemas }
      })
    },
    appendSchema(payload: { schema: any }) {
      const { schema } = payload
      this[`${schema.scope}Schemas`].push(schema)
    },
    updateSchema(payload: { index: any; schema: any }) {
      const { index, schema } = payload
      this[`${schema.scope}Schemas`].splice(index, 1, schema)
    },
    removeSchema(playload: { bucket: any; schema: any }) {
      const { bucket, schema } = playload
      return apis.schema.remove(bucket, schema).then(() => {
        const scopeSchemas = this[`${schema.scope}Schemas`]
        scopeSchemas.splice(scopeSchemas.indexOf(schema), 1)
        return { schema }
      })
    },
    listCollection(payload: { bucket: any; db: any; size: any; keyword: any }) {
      const action = (
        keyword: any,
        batchArg: { keyword: any; page: any; size: any } | undefined
      ) => {
        return apis.collection
          .list(bucket, db, { keyword, ...batchArg })
          .then((result: { collections: never[] }) => {
            this.collections = result.collections
            return result
          })
      }
      const { bucket, db, size, keyword } = payload
      return startBatch(action, [keyword], {
        size: size,
        wrap: reactive,
      })
    },
    appendCollection(payload: { collection: any }) {
      this.collections.splice(0, 0, payload.collection)
    },
    updateCollection(payload: { index: any; collection: any }) {
      const { index, collection } = payload
      this.collections.splice(index, 1, collection)
    },
    removeCollection(payload: { bucket: any; db: any; collection: any }) {
      const { bucket, db, collection } = payload
      return apis.collection.remove(bucket, db, collection.name).then(() => {
        this.collections.splice(this.collections.indexOf(collection), 1)
        return { collection }
      })
    },
    listDocument(payload: {
      bucket: any
      db: any
      cl: any
      size: any
      criterais: any
    }) {
      const action = (
        gatherArgs: any,
        batchArg: { page: any; size: any } | undefined
      ) => {
        return apis.doc
          .list(bucket, db, cl, gatherArgs, { ...batchArg })
          .then((result: { docs: never[] }) => {
            this.documents = result.docs
            return result
          })
      }
      const { bucket, db, cl, size, criterais } = payload

      return startBatch(action, [criterais], {
        size: size,
        wrap: reactive,
      })
    },
    updateDocument(payload: { index: any; document: any }) {
      const { index, document } = payload
      this.documents.splice(index, 1, document)
    },
    removeDocument(payload: { bucket: any; db: any; cl: any; document: any }) {
      const { bucket, db, cl, document } = payload
      return apis.doc.remove(bucket, db, cl, document.id).then(() => {
        this.documents.splice(this.documents.indexOf(document), 1)
        return { document }
      })
    },
    listTags(payload: { bucket: any }) {
      const { bucket } = payload
      return apis.tag.list(bucket).then((tags: never[]) => {
        this.tags = tags
        return { tags }
      })
    },
    appendTag(payload: { tag: any }) {
      this.tags.push(payload.tag)
    },
    updateTag(payload: { index: any; tag: any }) {
      const { index, tag } = payload
      this.tags.splice(index, 1, tag)
    },
    removeTag(payload: { bucket: any; tag: any }) {
      const { bucket, tag } = payload
      return apis.tag.remove(bucket, tag).then(() => {
        this.tags.splice(this.tags.indexOf(tag), 1)
        return { tag }
      })
    },
    conditionAddColumn(payload: { condition: any }) {
      const { condition } = payload
      const index = this.conditions.findIndex(
        (ele: any) => ele.columnName === condition.columnName
      )
      if (index !== -1) {
        this.conditions.splice(index, 1)
      }
      condition.rule.filter = {
        [condition.columnName]: condition.rule.filter[condition.columnName],
      }
      this.conditions.push(condition)
    },
    conditionDelBtn(payload: { columnName: any }) {
      const { columnName } = payload
      this.conditions.forEach((ele: any) => {
        if (ele.columnName !== columnName) {
          ele.rule.orderBy = {}
          ele.bySort = ''
        }
      })
    },
    conditionDelColumn(payload: { condition: any }) {
      const { condition } = payload
      const index = this.conditions.findIndex(
        (ele: any) => ele.columnName === condition.columnName
      )
      if (index !== -1) {
        this.conditions.splice(index, 1)
      }
    },
    conditionReset() {
      this.conditions = []
    },
    listReplica(payload: { bucket: any; size: any; keyword: any }) {
      const { bucket, size, keyword } = payload
      return startBatch(
        (
          keyword: any,
          batchArg: { keyword: any; page: any; size: any } | undefined
        ) => {
          return apis.replica
            .list(bucket, { keyword, ...batchArg })
            .then((result: { replicas: any[] }) => {
              result.replicas = result.replicas
                .filter(
                  (result: {
                    primary: { db: any; cl: any }
                    secondary: { db: any; cl: any }
                  }) => {
                    let {
                      primary: { db: pdb, cl: pcl },
                      secondary: { db: sdb, cl: scl },
                    } = result
                    return pdb.title && pcl.title && sdb.title && scl.title
                  }
                )
                .map(
                  (result: {
                    primary: { db: any; cl: any }
                    secondary: { db: any; cl: any }
                  }) => {
                    let {
                      primary: { db: pdb, cl: pcl },
                      secondary: { db: sdb, cl: scl },
                    } = result
                    ;[pdb, pcl, sdb, scl].forEach((item) => {
                      item.label = `${item.title} (${item.name})`
                    })
                    return {
                      primary: { db: pdb, cl: pcl },
                      secondary: { db: sdb, cl: scl },
                    }
                  }
                )
              this.replicas = result.replicas
              return result
            })
        },
        [keyword],
        {
          size: size,
        }
      )
    },
    appendReplica(payload: { replica: any }) {
      this.replicas.push(payload.replica)
    },
    removeReplica(payload: { bucket: any; params: any }) {
      const { bucket, params } = payload
      return apis.replica.remove(bucket, params).then(() => {
        this.replicas.splice(this.replicas.indexOf(params), 1)
        return { params }
      })
    },
    syncReplica(payload: { bucket: any; params: any }) {
      const { bucket, params } = payload
      return apis.replica.synchronize(bucket, params)
    },
    synchronizeAll(payload: { bucket: any; params: any }) {
      const { bucket, params } = payload
      let result = { success: [], error: [] }
      for (const param of params) {
        let transfer = {
          primary: {
            db: param.primary.db.name,
            cl: param.primary.cl.name,
          },
          secondary: {
            db: param.secondary.db.name,
            cl: param.secondary.cl.name,
          },
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
    },
  },
})
