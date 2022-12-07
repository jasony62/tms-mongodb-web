const {
  TMW_PLUGIN_DOC_IMPORT_JSON_NAME: Name,
  TMW_PLUGIN_DOC_IMPORT_JSON_BUCKET: Bucket,
  TMW_PLUGIN_DOC_IMPORT_JSON_DB: Db,
  TMW_PLUGIN_DOC_IMPORT_JSON_CL: Cl,
  TMW_PLUGIN_DOC_IMPORT_JSON_SCHEMA: Schema,
  TMW_PLUGIN_DOC_IMPORT_JSON_TITLE: Title,
  TMW_PLUGIN_DOC_IMPORT_JSON_WIDGET_URL,
} = process.env

module.exports = {
  widgetUrl: TMW_PLUGIN_DOC_IMPORT_JSON_WIDGET_URL || '/plugin/doc-import-json',
  name: Name ? Name : 'doc-import-json',
  title: Title ? Title : '导入文档(JSON)',
  bucket: Bucket,
  db: Db,
  cl: Cl,
  schema: Schema,
}
