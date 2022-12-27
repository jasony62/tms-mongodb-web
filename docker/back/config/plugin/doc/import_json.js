const {
  TMW_PLUGIN_WIDGET_URL_HOST,
  TMW_PLUGIN_DOC_IMPORT_JSON_NAME: Name,
  TMW_PLUGIN_DOC_IMPORT_JSON_BUCKET: Bucket,
  TMW_PLUGIN_DOC_IMPORT_JSON_DB: Db,
  TMW_PLUGIN_DOC_IMPORT_JSON_CL: Cl,
  TMW_PLUGIN_DOC_IMPORT_JSON_SCHEMA: Schema,
  TMW_PLUGIN_DOC_IMPORT_JSON_TITLE: Title,
  TMW_PLUGIN_DOC_IMPORT_JSON_WIDGET_URL,
} = process.env

// 插件前端页面地址
const widgetUrl = TMW_PLUGIN_DOC_IMPORT_JSON_WIDGET_URL
  ? TMW_PLUGIN_DOC_IMPORT_JSON_WIDGET_URL
  : TMW_PLUGIN_WIDGET_URL_HOST
  ? TMW_PLUGIN_WIDGET_URL_HOST + '/plugin/doc-import-json'
  : '/plugin/doc-import-json'

module.exports = {
  widgetUrl,
  name: Name ? Name : 'doc-import-json',
  title: Title ? Title : '导入文档(JSON)',
  bucket: Bucket,
  db: Db,
  cl: Cl,
  schema: Schema,
}
