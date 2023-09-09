const {
  TMW_PLUGIN_CL_VECDB: Disabled,
  TMW_PLUGIN_CL_VECDB_DB_BLACK_LIST: DbBlacklist,
  TMW_PLUGIN_WIDGET_URL_HOST,
  TMW_PLUGIN_CL_VECDB_NAME: Name,
  TMW_PLUGIN_CL_VECDB_BUCKET: Bucket,
  TMW_PLUGIN_CL_VECDB_DB: Db,
  TMW_PLUGIN_CL_VECDB_TITLE: Title,
  TMW_PLUGIN_CL_VECDB_WIDGET_URL,
} = process.env

// 插件前端页面地址
const widgetUrl = TMW_PLUGIN_CL_VECDB_WIDGET_URL
  ? TMW_PLUGIN_CL_VECDB_WIDGET_URL
  : TMW_PLUGIN_WIDGET_URL_HOST
  ? TMW_PLUGIN_WIDGET_URL_HOST + '/plugin/cl-vecdb'
  : '/plugin/cl-vecdb'

export default {
  disabled: /true|yes/i.test(Disabled),
  dbBlacklist: DbBlacklist,
  widgetUrl,
  name: Name ? Name : 'cl-vecdb',
  title: Title ? Title : '集合向量数据库',
  bucket: Bucket,
  db: Db,
}
