const {
  TMW_PLUGIN_DOC_IMPORT_COLLECTION_DISABLED: Disabled,
  TMW_PLUGIN_DOC_IMPORT_COLLECTION_DB_BLACK_LIST: DbBlacklist,
  TMW_PLUGIN_WIDGET_URL_HOST,
  TMW_PLUGIN_DOC_IMPORT_COLLECTION_NAME: Name,
  TMW_PLUGIN_DOC_IMPORT_COLLECTION_BUCKET: Bucket,
  TMW_PLUGIN_DOC_IMPORT_COLLECTION_DB: Db,
  TMW_PLUGIN_DOC_IMPORT_COLLECTION_TITLE: Title,
  TMW_PLUGIN_DOC_IMPORT_COLLECTION_WIDGET_URL
} = process.env

// 插件前端页面地址
const widgetUrl = TMW_PLUGIN_DOC_IMPORT_COLLECTION_WIDGET_URL
  ? TMW_PLUGIN_DOC_IMPORT_COLLECTION_WIDGET_URL
  : TMW_PLUGIN_WIDGET_URL_HOST
  ? TMW_PLUGIN_WIDGET_URL_HOST + '/plugin/doc-import-collection'
  : '/plugin/doc-import-collection'

module.exports = {
  disabled: /true|yes/i.test(Disabled),
  dbBlacklist: DbBlacklist,
  widgetUrl,
  name: Name ? Name : 'doc-import-collection',
  title: Title ? Title : '导入集合',
  bucket: Bucket,
  db: Db
}
