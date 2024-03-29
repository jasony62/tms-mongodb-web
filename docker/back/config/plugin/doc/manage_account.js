const {
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_DISABLED: Disabled,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_DB_BLACK_LIST: DbBlacklist,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_CL_BLACK_LIST: ClBlacklist,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_SCHEMA_BLACK_LIST: SchemaBlacklist,
  TMW_PLUGIN_WIDGET_URL_HOST,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_NAME: Name,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_BUCKET: Bucket,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_DB: Db,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_CL: Cl,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_SCHEMA: Schema,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_TITLE: Title,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_WIDGET_URL,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_SCHEMA_FILE: SchemaFile,
} = process.env

// 插件前端页面地址
const widgetUrl = TMW_PLUGIN_DOC_MANAGE_ACCOUNT_WIDGET_URL
  ? TMW_PLUGIN_DOC_MANAGE_ACCOUNT_WIDGET_URL
  : TMW_PLUGIN_WIDGET_URL_HOST
  ? TMW_PLUGIN_WIDGET_URL_HOST + '/plugin/doc-manage-account'
  : '/plugin/doc-manage-account'

export default {
  disabled: /true|yes/i.test(Disabled),
  dbBlacklist: DbBlacklist,
  clBlacklist: ClBlacklist,
  schemaBlacklist: SchemaBlacklist,
  widgetUrl,
  name: Name ? Name : 'doc-manage-account',
  title: Title ? Title : '账号管理',
  bucket: Bucket,
  db: Db || 'tmw_account',
  cl: Cl || 'account',
  schema: Schema,
  schemaFile: SchemaFile
    ? SchemaFile
    : './plugin/doc/manage_account/schema.json',
}
