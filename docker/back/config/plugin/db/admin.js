const {
  TMW_PLUGIN_WIDGET_URL_HOST,
  TMW_PLUGIN_DB_ADMIN_NAME: Name,
  TMW_PLUGIN_DB_ADMIN_BUCKET: Bucket,
  TMW_PLUGIN_DB_ADMIN_DB: Db,
  TMW_PLUGIN_DB_ADMIN_SCHEMA: Schema,
  TMW_PLUGIN_DB_ADMIN_TITLE: Title,
  TMW_PLUGIN_DB_ADMIN_WIDGET_URL,
} = process.env

// 前端地址
const widgetUrl = TMW_PLUGIN_DB_ADMIN_WIDGET_URL
  ? TMW_PLUGIN_DB_ADMIN_WIDGET_URL
  : TMW_PLUGIN_WIDGET_URL_HOST
  ? TMW_PLUGIN_WIDGET_URL_HOST + '/plugin/db-admin'
  : '/plugin/db-admin'

module.exports = {
  widgetUrl,
  name: Name ? Name : 'db-admin',
  title: Title ? Title : '数据库管理',
  bucket: Bucket,
  db: Db,
}
