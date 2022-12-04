const {
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_NAME: Name,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_BUCKET: Bucket,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_DB: Db,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_CL: Cl,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_SCHEMA: Schema,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_TITLE: Title,
  TMW_PLUGIN_DOC_MANAGE_ACCOUNT_WIDGET_URL,
} = process.env

module.exports = {
  widgetUrl:
    TMW_PLUGIN_DOC_MANAGE_ACCOUNT_WIDGET_URL || '/plugin/doc-manage-account',
  name: Name ? Name : 'doc-manage-account',
  title: Title ? Title : '账号管理',
  bucket: Bucket,
  db: Db,
  cl: Cl,
  cl: Schema,
}
