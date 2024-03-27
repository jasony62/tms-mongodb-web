import DbEditor from './DbEditor.vue'
import DirEditor from './DirEditor.vue'
import CollectionEditor from './CollectionEditor.vue'
import DocAclEditor from './DocAclEditor.vue'
import TagEditor from './TagEditor.vue'
import SelectCondition from './SelectCondition.vue'
import SchemaEditor from './SchemaEditor.vue'
import BucketEditor from './BucketEditor.vue'
import PickFileEditor from './PickFile.vue'

import { createApp } from 'vue'
import ElementPlus from 'element-plus'

type DbEditorOptions = {
  mode: any
  bucketName?: any
  database?: any
  onBeforeClose: Function
}

type DirEditorOptions = {
  mode: any
  bucketName?: any
  dbName: string
  parentDir: any
  dir?: any
  onBeforeClose: Function
}

type CollectionEditorOptions = {
  mode: any
  bucketName?: any
  dbName: string
  clDir?: any
  clSchema?: any
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

type SchemaEditorOptions = {
  bucketName?: any
  schema?: any
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
type PickFileEditorOptions = {
  url: string
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
export function openDirEditor(options: DirEditorOptions) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const { mode, bucketName, dbName, parentDir, dir, onBeforeClose } = options
  let app = createApp(DirEditor, {
    mode,
    bucketName,
    dbName,
    parentDir,
    dir,
    onClose: (newCl: any) => {
      if (newCl && onBeforeClose) onBeforeClose(newCl)
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
  const {
    mode,
    bucketName,
    dbName,
    clDir,
    clSchema,
    collection,
    onBeforeClose,
  } = options
  let app = createApp(CollectionEditor, {
    mode,
    bucketName,
    dbName,
    clDir,
    clSchema,
    collection,
    onClose: (newCl: any) => {
      if (newCl && onBeforeClose) onBeforeClose(newCl)
      app.unmount()
      document.body.removeChild(root)
    },
  })
  app.use(ElementPlus).mount(root)
}
/**
 * 编辑文档访问控制列表
 *
 * @param options
 */
export function openDocAclEditor(options: any) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const { mode, bucketName, doc, onBeforeClose } = options
  let app = createApp(DocAclEditor, {
    mode,
    bucketName,
    doc,
    onClose: () => {
      if (onBeforeClose) onBeforeClose()
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
/**
 * 集合中文档列表筛选条件
 */
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
  // @ts-ignore
  app.use(ElementPlus).use(JsonSchema).mount(root)
}
/***/
export function openBucketEditor(options: BucketEditorOptions) {
  const root = document.createElement('div')
  document.body.appendChild(root)
  const { mode, bucket, onBeforeClose } = options
  let app = createApp(BucketEditor, {
    mode,
    bucket,
    onClose: (newCl?: any) => {
      if (newCl && onBeforeClose) onBeforeClose(newCl)
      app.unmount()
      document.body.removeChild(root)
    },
  })
  app.use(ElementPlus).mount(root)
}
export function openPickFileEditor(options: PickFileEditorOptions) {
  const root = document.createElement('div')
  root.setAttribute('id', 'aEditor')
  document.body.appendChild(root)
  const { url, onBeforeClose } = options
  let app = createApp(PickFileEditor, {
    url,
    onClose: (newJson: any) => {
      if (newJson && onBeforeClose) onBeforeClose(newJson)
      app.unmount()
      if (document.body.contains(root)) document.body.removeChild(root)
    },
  })
  app.use(ElementPlus).mount(root)
}
