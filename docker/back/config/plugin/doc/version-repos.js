const {
  TMW_PLUGIN_DOC_VERSION_REPOS_ENABLED: Enabled,
  TMW_PLUGIN_DOC_VERSION_REPOS_DB_BLACK_LIST: DbBlacklist,
  TMW_PLUGIN_DOC_VERSION_REPOS_CL_BLACK_LIST: ClBlacklist,
  TMW_PLUGIN_DOC_VERSION_REPOS_SCHEMA_BLACK_LIST: SchemaBlacklist,
  TMW_PLUGIN_WIDGET_URL_HOST,
  TMW_PLUGIN_DOC_VERSION_REPOS_NAME: Name,
  TMW_PLUGIN_DOC_VERSION_REPOS_BUCKET: Bucket,
  TMW_PLUGIN_DOC_VERSION_REPOS_DB: Db,
  TMW_PLUGIN_DOC_VERSION_REPOS_CL: Cl,
  TMW_PLUGIN_DOC_VERSION_REPOS_SCHEMA: Schema,
  TMW_PLUGIN_DOC_VERSION_REPOS_TITLE: Title,
  TMW_PLUGIN_DOC_VERSION_REPOS_WIDGET_URL,
  TMW_PLUGIN_DOC_VERSION_REPOS_FS_DOMAIN_NAME: FsDomainName,
} = process.env

// 插件前端页面地址
const widgetUrl = TMW_PLUGIN_DOC_VERSION_REPOS_WIDGET_URL
  ? TMW_PLUGIN_DOC_VERSION_REPOS_WIDGET_URL
  : TMW_PLUGIN_WIDGET_URL_HOST
  ? TMW_PLUGIN_WIDGET_URL_HOST + '/plugin/doc-version-repos'
  : '/plugin/doc-version-repos'

module.exports = {
  disabled: !/true|yes/i.test(Enabled),
  dbBlacklist: DbBlacklist,
  clBlacklist: ClBlacklist,
  schemaBlacklist: SchemaBlacklist,
  widgetUrl,
  name: Name ? Name : 'doc-version-repos',
  title: Title ? Title : '版本管理',
  bucket: Bucket,
  db: Db,
  cl: Cl,
  schema: Schema,
  fsDomainName: FsDomainName,
}
