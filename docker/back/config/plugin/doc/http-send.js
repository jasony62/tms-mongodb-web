const {
  TMW_PLUGIN_DOC_HTTP_SEND_DISABLED: Disabled,
  TMW_PLUGIN_DOC_HTTP_SEND_DB_BLACK_LIST: DbBlacklist,
  TMW_PLUGIN_DOC_HTTP_SEND_CL_BLACK_LIST: ClBlacklist,
  TMW_PLUGIN_DOC_HTTP_SEND_SCHEMA_BLACK_LIST: SchemaBlacklist,
  TMW_PLUGIN_DOC_HTTP_SEND_SCHEMA: Schema,
  TMW_PLUGIN_WIDGET_URL_HOST,
  TMW_PLUGIN_DOC_HTTP_SEND_NAME: Name,
  TMW_PLUGIN_DOC_HTTP_SEND_AMOUNT: Amount,
  TMW_PLUGIN_DOC_HTTP_SEND_BUCKET: Bucket,
  TMW_PLUGIN_DOC_HTTP_SEND_DB: Db,
  TMW_PLUGIN_DOC_HTTP_SEND_CL: Cl,
  TMW_PLUGIN_DOC_HTTP_SEND_TITLE: Title,
  TMW_PLUGIN_DOC_HTTP_SEND_URL: Url,
  TMW_PLUGIN_DOC_HTTP_SEND_METHOD: Method,
  TMW_PLUGIN_DOC_HTTP_SEND_EXCLUDEID: ExcludeId,
  TMW_PLUGIN_DOC_HTTP_SEND_WIDGET_URL,
} = process.env

// 插件前端页面地址
const widgetUrl = TMW_PLUGIN_DOC_HTTP_SEND_WIDGET_URL
  ? TMW_PLUGIN_DOC_HTTP_SEND_WIDGET_URL
  : TMW_PLUGIN_WIDGET_URL_HOST
  ? TMW_PLUGIN_WIDGET_URL_HOST + '/plugin/doc-http-send'
  : '/plugin/doc-http-send'

export default {
  disabled: Disabled ? Disabled.split(',') : [],
  dbBlacklist: DbBlacklist ? DbBlacklist.split(',') : [],
  clBlacklist: ClBlacklist ? ClBlacklist.split(',') : [],
  schemaBlacklist: SchemaBlacklist ? SchemaBlacklist.split(',') : [],
  schema: Schema ? Schema.split(',') : [],
  widgetUrl,
  name: Name ? Name.split(',') : ['doc-http-send'],
  amount: Amount ? Amount.split(',') : ['many'],
  title: Title ? Title.split(',') : ['发送数据'],
  url: Url ? Url.split(',') : [],
  method: Method ? Method.split(',') : [],
  excludeId: ExcludeId ? ExcludeId.split(',') : [],
  bucket: Bucket ? Bucket.split(',') : [],
  db: Db ? Db.split(',') : [],
  cl: Cl ? Cl.split(',') : [],
}
