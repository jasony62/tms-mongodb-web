const {
  TMW_PLUGIN_CL_IMPORT_DISABLED: Disabled,
  TMW_PLUGIN_CL_IMPORT_DB_BLACK_LIST: DbBlacklist,
  TMW_PLUGIN_WIDGET_URL_HOST,
  TMW_PLUGIN_CL_IMPORT_NAME: Name,
  TMW_PLUGIN_CL_IMPORT_BUCKET: Bucket,
  TMW_PLUGIN_CL_IMPORT_DB: Db,
  TMW_PLUGIN_CL_IMPORT_TITLE: Title,
  TMW_PLUGIN_CL_IMPORT_WIDGET_URL,
} = process.env

// 插件前端页面地址
const widgetUrl = TMW_PLUGIN_CL_IMPORT_WIDGET_URL
  ? TMW_PLUGIN_CL_IMPORT_WIDGET_URL
  : TMW_PLUGIN_WIDGET_URL_HOST
  ? TMW_PLUGIN_WIDGET_URL_HOST + '/plugin/cl-import'
  : '/plugin/cl-import'

export default {
  disabled: /true|yes/i.test(Disabled),
  dbBlacklist: DbBlacklist,
  widgetUrl,
  name: Name ? Name : 'cl-import',
  title: Title ? Title : '导入集合',
  bucket: Bucket,
  db: Db,
}
