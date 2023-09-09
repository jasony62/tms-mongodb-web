const {
  TMW_PLUGIN_DOC_IMPORT_DISABLED: Disabled,
  TMW_PLUGIN_DOC_IMPORT_DB_BLACK_LIST: DbBlacklist,
  TMW_PLUGIN_DOC_IMPORT_CL_BLACK_LIST: ClBlacklist,
  TMW_PLUGIN_DOC_IMPORT_SCHEMA_BLACK_LIST: SchemaBlacklist,
  TMW_PLUGIN_WIDGET_URL_HOST,
  TMW_PLUGIN_DOC_IMPORT_NAME: Name,
  TMW_PLUGIN_DOC_IMPORT_BUCKET: Bucket,
  TMW_PLUGIN_DOC_IMPORT_DB: Db,
  TMW_PLUGIN_DOC_IMPORT_CL: Cl,
  TMW_PLUGIN_DOC_IMPORT_SCHEMA: Schema,
  TMW_PLUGIN_DOC_IMPORT_TITLE: Title,
  TMW_PLUGIN_DOC_IMPORT_WIDGET_URL,
  TMW_PLUGIN_DOC_IMPORT_DOWNLOAD_HOST: DownloadHost,
} = process.env

// 插件前端页面地址
const widgetUrl = TMW_PLUGIN_DOC_IMPORT_WIDGET_URL
  ? TMW_PLUGIN_DOC_IMPORT_WIDGET_URL
  : TMW_PLUGIN_WIDGET_URL_HOST
  ? TMW_PLUGIN_WIDGET_URL_HOST + '/plugin/doc-import'
  : '/plugin/doc-import'

export default {
  disabled: /true|yes/i.test(Disabled),
  dbBlacklist: DbBlacklist,
  clBlacklist: ClBlacklist,
  schemaBlacklist: SchemaBlacklist,
  widgetUrl,
  name: Name ? Name : 'doc-import',
  title: Title ? Title : '从文件导入数据',
  bucket: Bucket,
  db: Db,
  cl: Cl,
  schema: Schema,
  downloadHost: DownloadHost,
}
