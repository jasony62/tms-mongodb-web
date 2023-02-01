const {
  TMW_PLUGIN_WIDGET_URL_HOST,
  TMW_PLUGIN_DOC_IMPORT_NAME: Name,
  TMW_PLUGIN_DOC_IMPORT_BUCKET: Bucket,
  TMW_PLUGIN_DOC_IMPORT_DB: Db,
  TMW_PLUGIN_DOC_IMPORT_CL: Cl,
  TMW_PLUGIN_DOC_IMPORT_SCHEMA: Schema,
  TMW_PLUGIN_DOC_IMPORT_TITLE: Title,
  TMW_PLUGIN_DOC_IMPORT_WIDGET_URL,
} = process.env

// 插件前端页面地址
const widgetUrl = TMW_PLUGIN_DOC_IMPORT_WIDGET_URL
  ? TMW_PLUGIN_DOC_IMPORT_WIDGET_URL
  : TMW_PLUGIN_WIDGET_URL_HOST
  ? TMW_PLUGIN_WIDGET_URL_HOST + '/plugin/doc-import'
  : '/plugin/doc-import'

module.exports = {
  widgetUrl,
  name: Name ? Name : 'doc-import',
  title: Title ? Title : '从文件导入数据',
  bucket: Bucket,
  db: Db,
  cl: Cl,
  schema: Schema,
}
