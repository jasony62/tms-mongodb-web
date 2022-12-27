const {
  TMW_PLUGIN_WIDGET_URL_HOST,
  TMW_PLUGIN_DOC_CREATE_ACCOUNT_NAME: Name,
  TMW_PLUGIN_DOC_CREATE_ACCOUNT_BUCKET: Bucket,
  TMW_PLUGIN_DOC_CREATE_ACCOUNT_DB: Db,
  TMW_PLUGIN_DOC_CREATE_ACCOUNT_CL: Cl,
  TMW_PLUGIN_DOC_CREATE_ACCOUNT_SCHEMA: Schema,
  TMW_PLUGIN_DOC_CREATE_ACCOUNT_TITLE: Title,
  TMW_PLUGIN_DOC_CREATE_ACCOUNT_WIDGET_URL,
  TMW_PLUGIN_DOC_CREATE_ACCOUNT_SCHEMA_FILE: SchemaFile,
} = process.env

// 插件前端页面地址
const widgetUrl = TMW_PLUGIN_DOC_CREATE_ACCOUNT_WIDGET_URL
  ? TMW_PLUGIN_DOC_CREATE_ACCOUNT_WIDGET_URL
  : TMW_PLUGIN_WIDGET_URL_HOST
  ? TMW_PLUGIN_WIDGET_URL_HOST + '/plugin/doc-create-account'
  : '/plugin/doc-create-account'

module.exports = {
  widgetUrl,
  name: Name ? Name : 'doc-create-account',
  title: Title ? Title : '创建账号',
  bucket: Bucket,
  db: Db || 'tmw_account',
  cl: Cl || 'account',
  schema: Schema,
  schemaFile: SchemaFile
    ? SchemaFile
    : './plugin/doc/create_account/schema.json',
}
