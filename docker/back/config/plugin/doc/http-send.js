const {
  TMW_PLUGIN_DOC_HTTP_SEND_NAME: Name,
  TMW_PLUGIN_DOC_HTTP_SEND_BUCKET: Bucket,
  TMW_PLUGIN_DOC_HTTP_SEND_DB: Db,
  TMW_PLUGIN_DOC_HTTP_SEND_CL: Cl,
  TMW_PLUGIN_DOC_HTTP_SEND_TITLE: Title,
  TMW_PLUGIN_DOC_HTTP_SEND_URL: Url,
  TMW_PLUGIN_DOC_HTTP_SEND_METHOD: Method,
  TMW_PLUGIN_DOC_HTTP_SEND_EXCLUDEID: ExcludeId,
  TMW_PLUGIN_DOC_HTTP_SEND_WIDGET_URL,
} = process.env

module.exports = {
  widgetUrl: TMW_PLUGIN_DOC_HTTP_SEND_WIDGET_URL || '/plugin/doc-http-send',
  name: Name ? Name.split(',') : ['doc-http-send'],
  title: Title ? Title.split(',') : ['发送数据'],
  url: Url ? Url.split(',') : [],
  method: Method ? Method.split(',') : [],
  excludeId: ExcludeId ? ExcludeId.split(',') : [],
  bucket: Bucket ? Bucket.split(',') : [],
  db: Db ? Db.split(',') : [],
  cl: Cl ? Cl.split(',') : [],
}
