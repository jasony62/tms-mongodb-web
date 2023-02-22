const {
  TMW_PLUGIN_DOC_EXPORT_DISABLED: Disabled,
  TMW_PLUGIN_DOC_EXPORT_DB_BLACK_LIST: DbBlacklist,
  TMW_PLUGIN_DOC_EXPORT_CL_BLACK_LIST: ClBlacklist,
  TMW_PLUGIN_DOC_EXPORT_SCHEMA_BLACK_LIST: SchemaBlacklist,
  TMW_PLUGIN_WIDGET_URL_HOST,
  TMW_PLUGIN_DOC_EXPORT_NAME: Name,
  TMW_PLUGIN_DOC_EXPORT_BUCKET: Bucket,
  TMW_PLUGIN_DOC_EXPORT_DB: Db,
  TMW_PLUGIN_DOC_EXPORT_CL: Cl,
  TMW_PLUGIN_DOC_EXPORT_SCHEMA: Schema,
  TMW_PLUGIN_DOC_EXPORT_TITLE: Title,
  TMW_PLUGIN_DOC_EXPORT_WIDGET_URL,
} = process.env

// 插件前端页面地址
const widgetUrl = TMW_PLUGIN_DOC_EXPORT_WIDGET_URL
  ? TMW_PLUGIN_DOC_EXPORT_WIDGET_URL
  : TMW_PLUGIN_WIDGET_URL_HOST
  ? TMW_PLUGIN_WIDGET_URL_HOST + '/plugin/doc-export'
  : '/plugin/doc-export'

module.exports = {
  disabled: /true|yes/i.test(Disabled),
  dbBlacklist: DbBlacklist,
  clBlacklist: ClBlacklist,
  schemaBlacklist: SchemaBlacklist,
  widgetUrl,
  name: Name ? Name : 'doc-export',
  title: Title ? Title : '导出文档',
  bucket: Bucket,
  db: Db,
  cl: Cl,
  schema: Schema,
}
