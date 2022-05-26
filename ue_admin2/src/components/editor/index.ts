import DbEditor from './DbEditor.vue'
import CollectionEditor from './CollectionEditor.vue'
import DocEditor from './DocEditor.vue'
import TagEditor from './TagEditor.vue'
import ReplicaEditor from './ReplicaEditor.vue'
import ConfigJsonEditor from './ConfigJSON.vue'
import SelectCondition from './SelectCondition.vue'
import SchemaEditor from './SchemaEditor.vue'
import BucketEditor from './BucketEditor.vue'

import { createApp } from 'vue'
import ElementPlus from 'element-plus'

type DbEditorOptions = {
  mode: any
  bucketName?: any
  database?: any
  onBeforeClose: Function
}

type CollectionEditorOptions = {
  mode: any
  bucketName?: any
  dbName: string
  collection?: any
  onBeforeClose: Function
}

type DocEditorOptions = {
  mode: any
  bucketName?: any
  dbName: string
  collection?: any
  document?: any
  onBeforeClose: Function
}

type TagEditorOptions = {
  mode: any
  bucketName?: any
  tag?: any
  onBeforeClose: Function
}

type ReplicaEditorOptions = {
  bucketName?: any
  replica?: any
  onBeforeClose: Function
}

type SchemaEditorOptions = {
  bucketName?: any
  schema?: any
  onBeforeClose: Function
}

type ConfigJsonEditorOptions = {
  jsonData?: any
  onBeforeClose: Function
}

type SelectConditionOptions = {
  bucket?: string
  db?: string
  cl?: string
  columnName?: any
  schema?: any
  conditions?: any
  onBeforeClose: Function
}
type BucketEditorOptions = {
  mode: any
  bucket?: any
  onBeforeClose: Function
}

export function openDbEditor(options: DbEditorOptions) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const { mode, bucketName, database, onBeforeClose } = options
  let app = createApp(DbEditor, {
    mode,
    bucketName,
    database,
    onClose: (newDb: any) => {
      if (newDb && onBeforeClose) onBeforeClose(newDb)
      app.unmount()
      document.body.removeChild(root)
    },
  })
  app.use(ElementPlus).mount(root)
}
/***/
export function openCollectionEditor(options: CollectionEditorOptions) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const { mode, bucketName, dbName, collection, onBeforeClose } = options
  let app = createApp(CollectionEditor, {
    mode,
    bucketName,
    dbName,
    collection,
    onClose: (newCl: any) => {
      if (newCl && onBeforeClose) onBeforeClose(newCl)
      app.unmount()
      document.body.removeChild(root)
    },
  })
  app.use(ElementPlus).mount(root)
}
/***/
export function openTagEditor(options: TagEditorOptions) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const { mode, bucketName, tag, onBeforeClose } = options
  let app = createApp(TagEditor, {
    mode,
    bucketName,
    tag,
    onClose: (newDb: any) => {
      if (newDb && onBeforeClose) onBeforeClose(newDb)
      app.unmount()
      document.body.removeChild(root)
    },
  })
  app.use(ElementPlus).mount(root)
}
/***/
export function openReplicaEditor(options: ReplicaEditorOptions) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const { bucketName, replica, onBeforeClose } = options
  let app = createApp(ReplicaEditor, {
    bucketName,
    replica,
    onClose: (newReplica: any) => {
      if (newReplica && onBeforeClose) onBeforeClose(newReplica)
      app.unmount()
      document.body.removeChild(root)
    },
  })
  app.use(ElementPlus).mount(root)
}
/***/
export function openConfigJsonEditor(options: ConfigJsonEditorOptions) {
  const root = document.createElement('div')
  root.setAttribute('id', 'configJsonEditor')
  document.body.appendChild(root)
  const { jsonData, onBeforeClose } = options
  let app = createApp(ConfigJsonEditor, {
    jsonData,
    onClose: (newJson: any) => {
      if (newJson && onBeforeClose) onBeforeClose(newJson)
      app.unmount()
      document.body.removeChild(root)
    },
  })
  app.use(ElementPlus).mount(root)
}
export function openSelectConditionEditor(options: SelectConditionOptions) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const { bucket, db, cl, columnName, schema, conditions, onBeforeClose } =
    options
  let app = createApp(SelectCondition, {
    bucket,
    db,
    cl,
    columnName,
    schema,
    conditions,
    onClose: (newRule: any) => {
      if (newRule && onBeforeClose) onBeforeClose(newRule)
      app.unmount()
      document.body.removeChild(root)
    },
  })
  app.use(ElementPlus).mount(root)
}

import { JsonSchema } from 'tms-vue3-ui'
import 'tms-vue3-ui/dist/es/json-schema/style/tailwind.scss'
/***/
export function openSchemaEditor(options: SchemaEditorOptions) {
  const root = document.createElement('div')
  root.setAttribute('id', 'schemaEditor')
  document.body.appendChild(root)
  const { bucketName, schema, onBeforeClose } = options
  let app = createApp(SchemaEditor, {
    bucketName,
    schema,
    onClose: (newSchema: any) => {
      if (newSchema && onBeforeClose) onBeforeClose(newSchema)
      app.unmount()
      document.body.removeChild(root)
    },
  })
  app.use(ElementPlus).use(JsonSchema).mount(root)
}
/***/
export function openDocEditor(options: DocEditorOptions) {
  const root = document.createElement('div')
  document.body.appendChild(root)

  const {
    mode,
    bucketName,
    dbName,
    collection,
    document: doc,
    onBeforeClose,
  } = options

  let app = createApp(DocEditor, {
    mode,
    bucketName,
    dbName,
    collection,
    document: doc,
    onClose: (newCl: any) => {
      if (newCl && onBeforeClose) onBeforeClose(newCl)
      app.unmount()
      document.body.removeChild(root)
    },
  })
  app.use(ElementPlus).mount(root)
}
/***/
export function openBucketEditor(options: BucketEditorOptions) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const {
    mode,
    bucket,
    onBeforeClose
  } = options
  console.log('options',options)
  let app = createApp(BucketEditor, {
    mode,
    bucket,
    onClose: (newCl: any) => {
      if (newCl && onBeforeClose) onBeforeClose(newCl)
      app.unmount()
      document.body.removeChild(root)
    },
  })
  app.use(ElementPlus).mount(root)
}
